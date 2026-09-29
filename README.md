# 🌾 AgriOps Product Service

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Jest](https://img.shields.io/badge/tested_with-Jest-C21325?logo=jest&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

Product Service is the product catalog microservice of the **AgricultureOperations (AgriOps)** platform. It exposes JWT-protected CRUD at `/api/v1/products` for everything a farm buys, grows or uses:

- **Inputs** (`input`): fertilizers, pesticides and seeds, with active ingredient, safety (pre-harvest) period and hazard data.
- **Harvest** (`harvest`): crops such as bananas, cocoa and grains, with scientific name.
- **Equipment** (`equipment`): tools and machinery.

It is built with **NestJS 11**, **TypeScript** (strict) and **PostgreSQL** (Prisma 6), and follows **Clean Architecture** (Hexagonal / Ports & Adapters). The domain is independent of Nest, Prisma and HTTP.

---

## 🌐 Place in the AgriOps Platform

AgriOps is made of independent services, each in its own repository with its own CI/CD:

| Service | Stack | Role |
|---|---|---|
| [auth-service](https://github.com/AgricultureOperations/auth-service) | Express 5 + TypeScript + SQLite | Users, login, JWT issuance |
| [order-service](https://github.com/AgricultureOperations/order-service) | ASP.NET Core (.NET 9) + PostgreSQL | JWT-protected order CRUD |
| **product-service** (this repo) | NestJS 11 + Prisma + PostgreSQL | JWT-protected product catalog CRUD |
| [agriops-web](https://github.com/AgricultureOperations/frontend) | React 18 + Vite | Back-office SPA |

```
frontend ──(login/register, users)──▶ auth-service     ──issues JWT──┐
    │                                                                │ shared secret/issuer/audience
    ├──(Bearer JWT, orders)──────────▶ order-service   ◀─validates───┤
    └──(Bearer JWT, products)────────▶ product-service ◀─validates───┘
```

- **Tokens are issued by auth-service, not here.** This service validates HS256 tokens against `JWT_SECRET`, `JWT_ISSUER` (`auth-service`) and `JWT_AUDIENCE` (`orders-api`, the audience auth-service puts in every token). If any of them differ from auth-service's values, every request returns 401.
- The backends never call each other. The browser is the only client.
- This service owns the `products` table (in the `product` schema) exclusively. Other services refer to a product by `id` (UUID) only.

---

## 🛠 Tech Stack

- Node.js 22, NestJS 11, TypeScript 5 (strict, CommonJS)
- PostgreSQL 15 through Prisma ORM 6 (migrations with `prisma migrate`)
- `class-validator` + `class-transformer` for request validation
- `@nestjs/jwt` for HS256 token validation, `@nestjs/config` for validated env
- `@nestjs/swagger` for OpenAPI docs
- Jest + ts-jest + Supertest for tests
- Docker (multi-stage, `node:22-alpine`), GitHub Actions, Docker Hub, Render

---

## 🧱 Architecture

Dependencies point inward to `domain`, and `domain` imports nothing from the other layers or from any framework.

```
        ┌──────────────────┐
        │  interface/http  │  controller, JWT guard, exception filter
        └────────┬─────────┘
                 │ calls
                 ▼
        ┌──────────────────┐
        │   application    │  use cases (inbound ports), DTOs
        └────────┬─────────┘
                 │ uses
                 ▼
        ┌──────────────────┐
        │      domain      │  Product aggregate, value objects, errors, IProductRepository
        └──────────────────┘
                 ▲
                 │ implements port
        ┌──────────────────┐
        │  infrastructure  │  PrismaProductRepository, PrismaService, env validation
        └──────────────────┘
```

### Ports and adapters

| Kind | Port | Adapter |
|---|---|---|
| Driven (outbound) | `domain/repositories/IProductRepository` (token `PRODUCT_REPOSITORY`) | `infrastructure/repositories/PrismaProductRepository` (Prisma → PostgreSQL) |
| Driving (inbound) | `application/use-cases/{Create,GetProductById,ListProducts,Update,Delete}ProductUseCase` | `interface/http/controllers/ProductController` (HTTP) |

- Each use case is one class with a single `execute(...)` method. Use cases carry no Nest decorators. `src/product.module.ts`, the **only composition root**, builds them with factories.
- `Product` changes state only through `Product.create` and `product.update`. Both normalize the data (SKU upper-case, category lower-case) and enforce invariants: prices ≥ 0, tax rate 0–100, `minStockLevel ≤ reorderPoint ≤ maxStockLevel`, and presentation size and unit set together.
- Domain errors map to HTTP in `HttpExceptionFilter`: `ProductValidationError` → 400, `ProductNotFoundError` → 404, `SkuAlreadyExistsError` → 409.

### Request flow (create product)

```
Client ─▶ JwtAuthGuard ─▶ ValidationPipe(CreateProductDto) ─▶ ProductController (interface)
       ─▶ CreateProductUseCase (application) ─▶ Product.create (domain)
       ─▶ IProductRepository (port) ─▶ PrismaProductRepository (infrastructure) ─▶ PostgreSQL
```

---

## 📁 Project Structure

```bash
product-service/
├── Dockerfile
├── .github/workflows/ci-cd.yml
├── prisma/
│   ├── schema.prisma                 # Product model, ProductType/ProductStatus enums
│   └── migrations/                   # Prisma migrations (applied on container start)
├── src/
│   ├── main.ts                       # Bootstrap, Swagger at /api/docs, listen on 0.0.0.0:$PORT
│   ├── app.module.ts                 # ConfigModule with env validation
│   ├── product.module.ts             # Composition root: port → adapter, use case factories
│   ├── domain/
│   │   ├── entities/                 # Product aggregate (+ spec)
│   │   ├── value-objects/            # ProductType, ProductStatus, UnitOfMeasure
│   │   ├── errors/                   # ProductValidationError, ProductNotFoundError, SkuAlreadyExistsError
│   │   └── repositories/             # IProductRepository port + PRODUCT_REPOSITORY token
│   ├── application/
│   │   ├── dtos/                     # Create/Update/ListQuery/Response DTOs (class-validator)
│   │   └── use-cases/                # *.use-case.ts + *.use-case.spec.ts
│   ├── infrastructure/
│   │   ├── config/                   # validateEnv
│   │   ├── prisma/                   # PrismaService, PrismaModule
│   │   └── repositories/             # PrismaProductRepository, ProductMapper
│   └── interface/http/
│       ├── controllers/              # ProductController
│       ├── guards/                   # JwtAuthGuard
│       ├── filters/                  # HttpExceptionFilter
│       └── configure-app.ts          # CORS, ValidationPipe, filter (shared with tests)
└── test/
    ├── support/                      # In-memory repository, mocks, fixtures, token signing
    ├── integration/                  # Controller (HTTP) and repository (mocked Prisma) tests
    └── e2e/                          # Full stack against a real PostgreSQL
```

---

## 🔑 API

All endpoints require `Authorization: Bearer <jwt>` issued by auth-service. JSON is camelCase on the wire. Interactive docs are served at **`/api/docs`** (OpenAPI JSON at `/api/docs-json`).

| Method | Path | Body / Query | Success | Errors | Response |
|---|---|---|---|---|---|
| `POST` | `/api/v1/products` | `CreateProductDto` | 201 | 400, 401, 409 | `Product` |
| `GET` | `/api/v1/products` | `?page&limit&category&productType&status` | 200 | 400, 401 | `{ data: Product[], meta }` |
| `GET` | `/api/v1/products/{id}` | — | 200 | 400, 401, 404 | `Product` |
| `PATCH` | `/api/v1/products/{id}` | Any subset of `CreateProductDto` | 200 | 400, 401, 404, 409 | `Product` |
| `DELETE` | `/api/v1/products/{id}` | — | 204 | 400, 401, 404 | empty |

### List query

| Param | Default | Rules |
|---|---|---|
| `page` | `1` | Integer ≥ 1 |
| `limit` | `20` | Integer 1–100 |
| `category` | — | Case-insensitive exact match |
| `productType` | — | `harvest` \| `input` \| `equipment` |
| `status` | — | `active` \| `inactive` \| `discontinued` |

Results are sorted newest first. `meta` is `{ page, limit, total, totalPages }`.

### Product fields

| Field | Type | Required on create | Notes |
|---|---|---|---|
| `id` | UUID | — | Generated |
| `sku` | string ≤ 64 | ✔ | Unique, stored upper-case. Letters, digits, `.`, `_`, `-` |
| `name` | string ≤ 200 | ✔ | |
| `description` | string \| null | | |
| `category` | string ≤ 100 | ✔ | Free text, stored lower-case (`fertilizer`, `pesticide`, `seed`, `cocoa`, `banana`, …) |
| `productType` | `harvest` \| `input` \| `equipment` | ✔ | |
| `scientificName` | string \| null | | e.g. `Theobroma cacao` |
| `activeIngredient` | string \| null | | For inputs |
| `safetyPeriodDays` | integer ≥ 0 \| null | | Days between application and harvest |
| `isHazardous` | boolean | | Default `false` |
| `unitOfMeasure` | unit | ✔ | `kg` `g` `lb` `qq` `t` `l` `ml` `gal` `unit` `box` `bag` |
| `presentationSize` | number > 0 \| null | | Set together with `presentationUnit` |
| `presentationUnit` | unit \| null | | |
| `costPrice` | number ≥ 0, 2 decimals | ✔ | |
| `sellingPrice` | number ≥ 0, 2 decimals | ✔ | |
| `taxRate` | number 0–100 | | Percentage, default `0` |
| `minStockLevel` | integer ≥ 0 | | Default `0` |
| `maxStockLevel` | integer \| null | | ≥ `minStockLevel` |
| `reorderPoint` | integer ≥ 0 | | Default `0`. Between min and max |
| `requiresBatchTracking` | boolean | | Default `false` |
| `requiresExpiration` | boolean | | Default `false` |
| `storageConditions` | string \| null | | |
| `status` | `active` \| `inactive` \| `discontinued` | | Default `active` |
| `createdAt`, `updatedAt` | ISO 8601 | — | Managed |

On `PATCH`, an absent field is left unchanged, `null` clears a nullable field, and `null` for a non-nullable field is a 400. Unknown properties are rejected.

Example request:

```json
{
  "sku": "FERT-UREA-50KG",
  "name": "Urea 46% N",
  "category": "fertilizer",
  "productType": "input",
  "activeIngredient": "Urea",
  "unitOfMeasure": "bag",
  "presentationSize": 50,
  "presentationUnit": "kg",
  "costPrice": 28.5,
  "sellingPrice": 34.9,
  "taxRate": 15,
  "minStockLevel": 10,
  "maxStockLevel": 200,
  "reorderPoint": 25,
  "requiresBatchTracking": true
}
```

### Errors

Every error has the same body. The frontend reads `message`:

```json
{ "statusCode": 400, "message": "costPrice must not be less than 0; productType must be one of the following values: harvest, input, equipment", "errors": ["costPrice must not be less than 0", "productType must be one of the following values: harvest, input, equipment"] }
```

A missing, malformed, expired or wrongly signed token returns **401** (never 403), so the frontend's 401 interceptor logs the user out.

---

## 🗄 Database & Migrations

- **PostgreSQL** through Prisma. `DATABASE_URL` should end in `?schema=product`. In docker compose, this service shares the `postgres` server and database with order-service but keeps its table in its own `product` schema.
- The container runs `prisma migrate deploy` on **every start**, before serving traffic. An unreachable database or a failing migration stops the service from starting.
- Create migrations only with the tooling, after editing `prisma/schema.prisma`:

  ```bash
  npx prisma migrate dev --name <snake_case_name>
  ```

  Commit the migration folder together with the schema change.
- **Never edit or delete a migration that has been pushed to `main`.** Fix mistakes with a new migration. Keep migrations backward compatible with the running code (expand → migrate → contract).
- Money is stored as `DECIMAL(12,2)` (tax rate `DECIMAL(5,2)`, presentation size `DECIMAL(12,3)`) and exposed as JSON numbers.

---

## ⚙️ Getting Started

### 1. Clone and install

Requires **Node.js ≥ 20** (`.nvmrc` pins 22).

```bash
git clone https://github.com/AgricultureOperations/product-service.git product-service
cd product-service
nvm use
npm install          # also generates the Prisma client
```

### 2. Configure the environment

Copy `.env.example` to `.env` and fill it in:

| Variable | Description |
|---|---|
| `PORT` | Listen port (default `3001`) |
| `DATABASE_URL` | **Required.** e.g. `postgresql://agriops:<password>@localhost:5432/orders?schema=product` |
| `JWT_SECRET` | **Required**, at least 32 bytes. Must match auth-service's `JWT_SECRET` |
| `JWT_ISSUER` | Token issuer, default `auth-service` |
| `JWT_AUDIENCE` | Token audience, default `orders-api` (the value auth-service issues) |
| `FRONTEND_URL` | The only allowed CORS origin. Default `http://localhost:5173`. On Render: `https://agricultureops.netlify.app` |

Startup fails with a clear message if a required variable is missing or `JWT_SECRET` is too short. `.env*` files (except `.env.example`) are gitignored and excluded from the Docker build context. Never commit them.

### 3. Run

```bash
npx prisma migrate deploy   # apply migrations to DATABASE_URL
npm run start:dev           # watch mode
npm run build               # nest build: src/ → dist/
npm run start:prod          # node dist/main.js
```

The API is served on `http://localhost:3001` and Swagger UI on `http://localhost:3001/api/docs`.

---

## 🧪 Testing

```bash
npm run test                                  # unit + integration, no database needed
npm run test:cov                              # with coverage
npx jest src/domain                           # a folder
npx jest -t "returns 409"                     # a test by name

# end-to-end against a real, disposable PostgreSQL
DATABASE_URL="postgresql://test:test@localhost:55432/products_test?schema=product" npx prisma migrate deploy
DATABASE_URL="postgresql://test:test@localhost:55432/products_test?schema=product" npm run test:e2e
```

| Suite | Location | What it covers |
|---|---|---|
| Domain unit | `src/domain/**/*.spec.ts` | `Product` invariants, defaults, normalization, update semantics |
| Use case unit | `src/application/use-cases/*.use-case.spec.ts` | Each use case against a mocked port or the in-memory repository |
| Controller integration | `test/integration/product.controller.spec.ts` | Real Nest pipeline (JWT guard, validation, filter, use cases) over HTTP with an in-memory repository |
| Repository integration | `test/integration/prisma-product.repository.spec.ts` | Prisma queries, `Decimal` mapping and error translation with a mocked client |
| E2E | `test/e2e/*.e2e-spec.ts` | Full CRUD, decimals, concurrent SKU conflicts and filters on PostgreSQL |

The e2e suite deletes every product in the target schema before each test. It refuses to run without a real `DATABASE_URL`. A throwaway database is easy to start:

```bash
docker run -d --rm --name products-test-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=products_test -p 55432:5432 postgres:15
```

---

## 🐳 Docker

```bash
docker build -t product-service .
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://agriops:<password>@host.docker.internal:5432/orders?schema=product" \
  -e JWT_SECRET=... -e FRONTEND_URL=http://localhost:5173 \
  product-service
```

- Multi-stage build on `node:22-alpine` (with `openssl` for Prisma). The runtime stage installs production dependencies only, runs as the `node` user and exposes port 3001.
- The container `CMD` is `npm run start:migrate` (`prisma migrate deploy && node dist/main.js`).
- From inside a container, reach a Postgres on your machine with `host.docker.internal`, not `localhost`.

### Full stack with docker compose

The workspace root's `docker-compose.yml` runs postgres, auth-service, order-service, product-service and the frontend. It builds `DATABASE_URL` and the JWT values from the **root `.env`** only.

```bash
# from the workspace root
docker compose up -d --build product-service
docker compose logs -f product-service
```

To check the JWT link end to end, log in through auth-service, then call `GET http://localhost:3001/api/v1/products` with the token. A 401 means the JWT settings differ between the services.

---

## 🚀 CI/CD

`.github/workflows/ci-cd.yml` runs on pushes to `main` that touch source, tests, Prisma files, package files, `Dockerfile` or workflows. On pull requests it runs only the first job.

1. **build-test:** `npm ci`, `npm run build`, `npm test`, then `prisma migrate deploy` and `npm run test:e2e` against a `postgres:15` service container.
2. **docker:** build and push `<DOCKER_USERNAME>/product-service:{sha,latest}` to Docker Hub.
3. **deploy:** trigger the Render deploy hook (secret `RENDER_DEPLOY_HOOK_URL`). Migrations run when the new container starts.

On Render, set `DATABASE_URL`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` and `FRONTEND_URL=https://agricultureops.netlify.app`.

---

## ⚠️ Known Issues

- **The JWT audience is `orders-api`.** auth-service issues a single audience for every backend, so this service accepts the order-service audience. A per-service audience needs an auth-service change first.
- **No authorization beyond authentication.** Any logged-in user can create, update or delete products. There are no roles in the token yet.
- **`DELETE` is a hard delete.** Prefer `status: "discontinued"` for products that have history, since future inventory or order lines will reference them by `id`.
- **Money is a JS `number` in the domain.** It is exact in storage (`DECIMAL`) and validated to 2 decimals, but arithmetic on prices (e.g. tax totals) should use a decimal library when it is added.
- `npm audit` reports a high-severity advisory in `deepmerge-ts`, a transitive dependency of the Prisma CLI (`@prisma/config`). The CLI ships in the image because migrations run on startup.

---

## 🔮 Future Improvements

- Role-based authorization (e.g. only admins can create or delete products) once auth-service issues a role claim
- Text search on name and SKU, and sorting options for `GET /api/v1/products`
- Inventory and stock movements (batches, expiration dates) as a separate bounded context that uses `reorderPoint` and `requiresBatchTracking`
- Price history and multi-currency support
- Health check endpoint for Render
- Observability (structured logging, Prometheus, Grafana)

---

## 🤝 Contributing

- Read [`CLAUDE.md`](./CLAUDE.md) first. It describes the layering, the error contract, commands and migration rules for this service.
- Keep `domain` free of framework imports. Register every new port, adapter and use case in `src/product.module.ts`.
- Every use case and domain rule needs a unit test. Every new endpoint needs a controller integration test.
- Keep every route under `/api/v1/`. A breaking change to a request or response shape needs a new version (`/api/v2/...`) served alongside v1, because the frontend (Netlify) and this service (Render) deploy independently.
- Status codes are part of the contract: 401 only for "not authenticated", 403 for "not allowed", 404 for missing resources, 409 for conflicts, 400 for validation errors. Error bodies carry `message`.
- Changing the response shape requires a matching change to the frontend mirror (`src/features/products/interfaces/` in the agriops-web repo) and its Playwright mock (`tests/fixtures/product-service.ts`), with coordinated deploys.

---

## 📌 Author

**Edward Cruz**
Backend Developer | NestJS | TypeScript | Clean Architecture | Microservices
