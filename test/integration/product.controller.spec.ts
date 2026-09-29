import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PRODUCT_REPOSITORY } from '../../src/domain';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { configureApp } from '../../src/interface/http/configure-app';
import { InMemoryProductRepository } from '../support/in-memory-product.repository';
import { cocoaProps, fertilizerProps } from '../support/product.fixtures';
import { signToken } from '../support/test-env';

/**
 * Drives the real HTTP pipeline (JWT guard, ValidationPipe, exception filter, controller, use cases)
 * with the repository port bound to an in-memory adapter. No database needed.
 */
describe('ProductController (HTTP)', () => {
  let app: INestApplication;
  let repository: InMemoryProductRepository;
  let auth: { Authorization: string };
  const unknownId = '0b0e5a8c-3f3a-4d0e-9d7e-4d3c5a1f2b6e';

  beforeAll(() => {
    auth = { Authorization: `Bearer ${signToken()}` };
  });

  beforeEach(async () => {
    repository = new InMemoryProductRepository();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRODUCT_REPOSITORY)
      .useValue(repository)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const createProduct = (body: object = fertilizerProps()) =>
    request(app.getHttpServer()).post('/api/v1/products').set(auth).send(body);

  describe('authentication', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ statusCode: 401, message: 'Missing bearer token' });
    });

    it('returns 401 for a non-Bearer scheme', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products').set('Authorization', `Basic ${signToken()}`);
      expect(res.status).toBe(401);
    });

    it.each([
      ['a wrong secret', { secret: 'another-secret-that-is-at-least-32-bytes' }],
      ['a wrong issuer', { issuer: 'someone-else' }],
      ['a wrong audience', { audience: 'other-api' }],
      ['an expired token', { expiresIn: -10 }],
    ])('returns 401 for %s', async (_label, overrides) => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${signToken(overrides)}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });

  describe('POST /api/v1/products', () => {
    it('creates a product and returns 201', async () => {
      const res = await createProduct();

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ sku: 'FERT-UREA-50KG', productType: 'input', costPrice: 28.5, status: 'active' });
      expect(res.body.id).toEqual(expect.any(String));
      expect(await repository.findById(res.body.id)).not.toBeNull();
    });

    it('returns 400 with every validation message', async () => {
      const res = await createProduct({ sku: '', productType: 'tractor', costPrice: -5 });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.any(String));
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('name'),
          expect.stringContaining('productType'),
          expect.stringContaining('costPrice'),
        ]),
      );
    });

    it('returns 400 for unknown properties', async () => {
      const res = await createProduct({ ...fertilizerProps(), stock: 10 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('property stock should not exist');
    });

    it('returns 400 for null in a non-nullable optional field', async () => {
      const res = await createProduct({ ...fertilizerProps(), isHazardous: null });
      expect(res.status).toBe(400);
    });

    it('returns 400 for a price with more than two decimals', async () => {
      const res = await createProduct(fertilizerProps({ sellingPrice: 10.555 }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when a domain invariant fails', async () => {
      const res = await createProduct(fertilizerProps({ minStockLevel: 100, maxStockLevel: 50, reorderPoint: 100 }));
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/maxStockLevel/);
    });

    it('returns 409 for a duplicate SKU, whatever its case', async () => {
      await createProduct();
      const res = await createProduct(fertilizerProps({ sku: 'fert-urea-50kg' }));

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ statusCode: 409, message: 'A product with SKU FERT-UREA-50KG already exists' });
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('returns the product', async () => {
      const { body: created } = await createProduct();
      const res = await request(app.getHttpServer()).get(`/api/v1/products/${created.id}`).set(auth);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(created);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/products/${unknownId}`).set(auth);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`Product ${unknownId} not found`);
    });

    it('returns 400 for an id that is not a UUID', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products/not-a-uuid').set(auth);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/products', () => {
    beforeEach(async () => {
      await createProduct(fertilizerProps({ sku: 'FERT-1' }));
      await createProduct(fertilizerProps({ sku: 'PEST-1', category: 'Pesticide', isHazardous: true }));
      await createProduct(cocoaProps({ sku: 'COCOA-1' }));
      await createProduct(cocoaProps({ sku: 'COCOA-2', status: 'inactive' }));
    });

    it('returns a paginated list with defaults', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products').set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 4, totalPages: 1 });
    });

    it('converts page and limit from the query string', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products?page=2&limit=3').set(auth);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toEqual({ page: 2, limit: 3, total: 4, totalPages: 2 });
    });

    it('filters by productType, status and case-insensitive category', async () => {
      const byType = await request(app.getHttpServer()).get('/api/v1/products?productType=harvest&status=active').set(auth);
      expect(byType.body.data.map((p: { sku: string }) => p.sku)).toEqual(['COCOA-1']);

      const byCategory = await request(app.getHttpServer()).get('/api/v1/products?category=PESTICIDE').set(auth);
      expect(byCategory.body.data.map((p: { sku: string }) => p.sku)).toEqual(['PEST-1']);
    });

    it.each(['limit=101', 'limit=0', 'page=0', 'page=abc', 'productType=tool', 'status=deleted', 'foo=bar'])(
      'returns 400 for %s',
      async (qs) => {
        const res = await request(app.getHttpServer()).get(`/api/v1/products?${qs}`).set(auth);
        expect(res.status).toBe(400);
      },
    );
  });

  describe('PATCH /api/v1/products/:id', () => {
    it('updates only the given fields', async () => {
      const { body: created } = await createProduct();
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${created.id}`)
        .set(auth)
        .send({ sellingPrice: 36.5, status: 'discontinued', storageConditions: null });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        sellingPrice: 36.5,
        status: 'discontinued',
        storageConditions: null,
        name: created.name,
        costPrice: created.costPrice,
      });
    });

    it('returns 400 for null in a required field', async () => {
      const { body: created } = await createProduct();
      const res = await request(app.getHttpServer()).patch(`/api/v1/products/${created.id}`).set(auth).send({ name: null });
      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/v1/products/${unknownId}`).set(auth).send({ name: 'x' });
      expect(res.status).toBe(404);
    });

    it('returns 409 when the new SKU is taken', async () => {
      await createProduct(fertilizerProps({ sku: 'TAKEN' }));
      const { body: other } = await createProduct(fertilizerProps({ sku: 'MINE' }));

      const res = await request(app.getHttpServer()).patch(`/api/v1/products/${other.id}`).set(auth).send({ sku: 'taken' });
      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('returns 204 and removes the product', async () => {
      const { body: created } = await createProduct();

      const res = await request(app.getHttpServer()).delete(`/api/v1/products/${created.id}`).set(auth);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      const after = await request(app.getHttpServer()).get(`/api/v1/products/${created.id}`).set(auth);
      expect(after.status).toBe(404);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app.getHttpServer()).delete(`/api/v1/products/${unknownId}`).set(auth);
      expect(res.status).toBe(404);
    });
  });
});
