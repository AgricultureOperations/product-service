# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Product Service is the product catalog microservice of the AgricultureOperations platform. It manages agricultural inputs (fertilizers, pesticides, seeds), harvested crops (bananas, cocoa, grains) and equipment. It uses NestJS 11, TypeScript (strict, CommonJS), Prisma 6 and PostgreSQL. Tokens are issued by auth-service. This service only validates them.

## Architectural Pattern: Clean Architecture (Hexagonal)

Dependencies point inward: `interface → application → domain`, and `infrastructure → domain`. `domain` imports nothing from the other layers or from any framework.

- **domain/**: the `Product` aggregate, value objects (`PRODUCT_TYPES`, `PRODUCT_STATUSES`, `UNITS_OF_MEASURE`), domain errors and the driven port `IProductRepository` with its token `PRODUCT_REPOSITORY`. Plain TypeScript only.
- **application/**: one class per use case with a single `execute(...)` method, plus the DTOs. Use cases take the port in their constructor and carry **no Nest decorators**. DTOs are the one place where `class-validator`, `class-transformer` and `@nestjs/swagger` decorators are allowed.
- **infrastructure/**: `PrismaService`, `PrismaProductRepository` (the adapter), `ProductMapper` (Prisma `Decimal` ↔ `number`) and env validation.
- **interface/http/**: `ProductController`, `JwtAuthGuard`, `HttpExceptionFilter` and `configureApp`.
- `src/product.module.ts` is the **only composition root**. It binds `PRODUCT_REPOSITORY` to the Prisma adapter and builds each use case with a `useFactory`. Register every new use case or adapter there.

Rules that keep the entity valid:
- `Product.create` and `product.update` normalize the data (SKU upper-case, category lower-case, blank text → `null`) and check every invariant, throwing `ProductValidationError`. `Product.restore` skips the checks and is only for rows loaded from the database.
- `undefined` in an update means "leave unchanged". `null` clears a nullable field. `UpdateProductDto` uses `PartialType(..., { skipNullProperties: false })` and `@IsOptionalNotNull()` so that `null` is rejected for non-nullable fields.
- Return `ProductResponseDto`, never the entity or a Prisma row.

## Errors and Status Codes

`HttpExceptionFilter` catches everything and returns `{ statusCode, message, errors? }`. The frontend reads `message`.

| Source | Status |
|---|---|
| `ValidationPipe` (whitelist + forbidNonWhitelisted), `ParseUUIDPipe`, `ProductValidationError` | 400 (`errors` lists each validation message) |
| `JwtAuthGuard`: missing, non-Bearer, bad signature, wrong issuer/audience, expired | 401, never 403 |
| `ProductNotFoundError` | 404 |
| `SkuAlreadyExistsError` (the use case checks first, and the adapter maps Prisma `P2002`) | 409 |
| Anything else | 500 `Internal Server Error` (logged) |

## Key Folder Responsibilities

| Path | Responsibility |
|---|---|
| `src/main.ts` | Bootstraps Nest, calls `configureApp`, mounts Swagger at `/api/docs`, listens on `0.0.0.0:$PORT` |
| `src/app.module.ts` | `ConfigModule.forRoot({ validate: validateEnv })`. Validation runs at import time |
| `src/product.module.ts` | Composition root (see above) |
| `src/interface/http/configure-app.ts` | CORS, `ValidationPipe`, exception filter. Shared by `main.ts` and the tests |
| `prisma/schema.prisma` | Schema. Columns are snake_case through `@map`, and the table is `products` |
| `prisma/migrations/` | Prisma migrations, applied by `prisma migrate deploy` when the container starts |
| `test/support/` | In-memory repository, Jest mock of the port, fixtures, test env and token signing |
| `test/integration/` | HTTP tests through the full Nest pipeline, and adapter tests with a mocked Prisma client |
| `test/e2e/` | Full stack against a real PostgreSQL |

## Build & Run Commands

Node ≥ 20 is required (`.nvmrc` pins 22). Run `nvm use` first, because the machine default may be Node 18.

```bash
npm install                 # also runs prisma generate
npm run start:dev           # nest start --watch (needs DATABASE_URL reachable)
npm run build               # nest build: src/ -> dist/ (specs excluded)
npm run start:prod          # node dist/main.js
npm run start:migrate       # prisma migrate deploy && node dist/main.js (the container CMD)

npx prisma migrate dev --name <snake_case_name>   # create a migration after editing schema.prisma
```

There is no lint script.

## Test Commands

```bash
npm test                                         # unit (src/**/*.spec.ts) + integration (test/integration). No DB needed
npx jest src/application/use-cases/create-product.use-case.spec.ts
npx jest -t "returns 409"
DATABASE_URL=postgresql://...?schema=product npm run test:e2e   # real Postgres, migrations applied first
```

- `test/support/jest.setup.ts` sets the env before any import, because `AppModule` validates the env when it is loaded. It never overrides a variable that is already set.
- The e2e suite runs `deleteMany()` on the products table before each test. Point it only at a disposable database. It refuses to run with the placeholder `DATABASE_URL`.

## Environment

Keys are listed in `.env.example`: `PORT` (default 3001), `DATABASE_URL` (required; use `?schema=product`), `JWT_SECRET` (required, at least 32 bytes), `JWT_ISSUER` (default `auth-service`), `JWT_AUDIENCE` (default `orders-api`, the audience auth-service puts in every token), `FRONTEND_URL` (CORS origin, default `http://localhost:5173`). The JWT values must match auth-service's.

`.env*` files (except `.env.example`) are gitignored and excluded from the Docker build context. Never read, print or commit them.

## Docker & CI/CD

- **Dockerfile**: a multi-stage build on `node:22-alpine` with `openssl` installed for the Prisma engines. The runtime stage runs `npm ci --omit=dev`, which generates the client through `postinstall`. It runs as `node`, exposes 3001, and its `CMD` is `npm run start:migrate`. `prisma` is a runtime dependency because of that.
- **docker compose** (workspace root): the `product-service` service shares the `postgres` server and database, and uses its own `product` schema.
- **CI/CD** (`.github/workflows/ci-cd.yml`): on pushes to `main` (and on PRs, test job only). It builds, runs `npm test`, then `prisma migrate deploy` and `npm run test:e2e` against a Postgres service container. Then it pushes `<DOCKER_USERNAME>/product-service:{sha,latest}` and triggers the Render deploy hook.

## Data Ownership and Migrations

- This service owns the `products` table exclusively. Other services must refer to a product only by `id` (UUID), with no foreign key and no direct reads of this schema.
- Never edit or delete a migration that has been pushed to `main`. Fix mistakes with a new migration. Keep migrations backward compatible (expand → migrate → contract).
- `unitOfMeasure` and `presentationUnit` are stored as text, so appending a unit only needs a change to `UNITS_OF_MEASURE`. `productType` and `status` are Postgres enums, so a new value needs a migration. Only append values. Never rename one.
