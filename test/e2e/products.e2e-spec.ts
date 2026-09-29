import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { configureApp } from '../../src/interface/http/configure-app';
import { cocoaProps, fertilizerProps } from '../support/product.fixtures';
import { TEST_ENV, signToken } from '../support/test-env';

/**
 * Full stack against a real PostgreSQL: HTTP → use cases → PrismaProductRepository → database.
 * Needs a DATABASE_URL with migrations applied (`npx prisma migrate deploy`). Deletes every product
 * in that schema before each test, so never point it at data you want to keep.
 */
describe('Products (e2e, PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: { Authorization: string };

  beforeAll(async () => {
    if (process.env.DATABASE_URL === TEST_ENV.DATABASE_URL) {
      throw new Error('Set DATABASE_URL to a disposable PostgreSQL database to run the e2e tests');
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    auth = { Authorization: `Bearer ${signToken()}` };
  });

  beforeEach(async () => {
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
  });

  const api = () => request(app.getHttpServer());

  it('runs the full CRUD lifecycle', async () => {
    const created = await api().post('/api/v1/products').set(auth).send(fertilizerProps());
    expect(created.status).toBe(201);
    const id = created.body.id;

    const fetched = await api().get(`/api/v1/products/${id}`).set(auth);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(created.body);

    const updated = await api()
      .patch(`/api/v1/products/${id}`)
      .set(auth)
      .send({ sellingPrice: 36.75, maxStockLevel: null, status: 'inactive' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ sellingPrice: 36.75, maxStockLevel: null, status: 'inactive' });
    expect(new Date(updated.body.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(created.body.updatedAt).getTime());
    expect(updated.body.createdAt).toBe(created.body.createdAt);

    const deleted = await api().delete(`/api/v1/products/${id}`).set(auth);
    expect(deleted.status).toBe(204);
    expect((await api().get(`/api/v1/products/${id}`).set(auth)).status).toBe(404);
    expect((await api().delete(`/api/v1/products/${id}`).set(auth)).status).toBe(404);
  });

  it('round-trips decimals and nullable fields through PostgreSQL', async () => {
    const body = fertilizerProps({ costPrice: 0.1, sellingPrice: 12345.67, taxRate: 12.5, presentationSize: 0.125 });
    const { body: created } = await api().post('/api/v1/products').set(auth).send(body);
    const { body: fetched } = await api().get(`/api/v1/products/${created.id}`).set(auth);

    expect(fetched).toMatchObject({ costPrice: 0.1, sellingPrice: 12345.67, taxRate: 12.5, presentationSize: 0.125 });

    const { body: cocoa } = await api().post('/api/v1/products').set(auth).send(cocoaProps());
    expect(cocoa).toMatchObject({ presentationSize: null, maxStockLevel: null, description: null });
  });

  it('enforces SKU uniqueness in the database, including concurrent creates', async () => {
    const results = await Promise.all(
      [1, 2, 3].map(() => api().post('/api/v1/products').set(auth).send(fertilizerProps())),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(await prisma.product.count()).toBe(1);
  });

  it('lists with filters and pagination', async () => {
    for (const [i, props] of [
      fertilizerProps({ sku: 'FERT-1' }),
      fertilizerProps({ sku: 'PEST-1', category: 'pesticide' }),
      cocoaProps({ sku: 'COCOA-1' }),
      cocoaProps({ sku: 'COCOA-2', status: 'inactive' }),
      cocoaProps({ sku: 'BANANA-1', category: 'banana' }),
    ].entries()) {
      const res = await api().post('/api/v1/products').set(auth).send(props);
      expect(res.status).toBe(201);
      // Distinct createdAt values keep the newest-first order deterministic.
      if (i < 4) await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const page1 = await api().get('/api/v1/products?limit=2').set(auth);
    expect(page1.body.data.map((p: { sku: string }) => p.sku)).toEqual(['BANANA-1', 'COCOA-2']);
    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });

    const harvestActive = await api().get('/api/v1/products?productType=harvest&status=active').set(auth);
    expect(harvestActive.body.data.map((p: { sku: string }) => p.sku)).toEqual(['BANANA-1', 'COCOA-1']);

    const pesticide = await api().get('/api/v1/products?category=Pesticide').set(auth);
    expect(pesticide.body.meta.total).toBe(1);
  });
});
