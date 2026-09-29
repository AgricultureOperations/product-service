import { Prisma, Product as ProductRow } from '@prisma/client';
import { Product, ProductNotFoundError, SkuAlreadyExistsError } from '../../src/domain';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { PrismaProductRepository } from '../../src/infrastructure/repositories/prisma-product.repository';
import { makeProduct } from '../support/product.fixtures';

/** Checks the adapter's queries, mapping and error translation against a mocked Prisma client. */
describe('PrismaProductRepository', () => {
  let prisma: {
    product: Record<'create' | 'update' | 'findUnique' | 'findMany' | 'count' | 'deleteMany', jest.Mock>;
    $transaction: jest.Mock;
  };
  let repository: PrismaProductRepository;

  const toRow = (product: Product): ProductRow => {
    const p = product.toPrimitives();
    return {
      ...p,
      presentationSize: p.presentationSize === null ? null : new Prisma.Decimal(p.presentationSize),
      costPrice: new Prisma.Decimal(p.costPrice),
      sellingPrice: new Prisma.Decimal(p.sellingPrice),
      taxRate: new Prisma.Decimal(p.taxRate),
    };
  };

  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('failed', { code, clientVersion: 'test' });

  beforeEach(() => {
    prisma = {
      product: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    repository = new PrismaProductRepository(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('writes every field, with money as Decimal', async () => {
      const product = makeProduct();
      await repository.create(product);

      const { data } = prisma.product.create.mock.calls[0][0];
      expect(data).toMatchObject({ id: product.id, sku: 'FERT-UREA-50KG', category: 'fertilizer' });
      expect(data.costPrice).toBeInstanceOf(Prisma.Decimal);
      expect(data.costPrice.toString()).toBe('28.5');
      expect(data.presentationSize.toString()).toBe('50');
    });

    it('translates a unique violation into SkuAlreadyExistsError', async () => {
      prisma.product.create.mockRejectedValue(prismaError('P2002'));
      await expect(repository.create(makeProduct())).rejects.toThrow(SkuAlreadyExistsError);
    });

    it('rethrows other errors unchanged', async () => {
      const failure = new Error('connection lost');
      prisma.product.create.mockRejectedValue(failure);
      await expect(repository.create(makeProduct())).rejects.toBe(failure);
    });
  });

  describe('update', () => {
    it('updates by id and never rewrites id or createdAt', async () => {
      const product = makeProduct();
      await repository.update(product);

      const { where, data } = prisma.product.update.mock.calls[0][0];
      expect(where).toEqual({ id: product.id });
      expect(data).not.toHaveProperty('id');
      expect(data).not.toHaveProperty('createdAt');
      expect(data.updatedAt).toEqual(product.toPrimitives().updatedAt);
    });

    it('translates P2025 into ProductNotFoundError and P2002 into SkuAlreadyExistsError', async () => {
      prisma.product.update.mockRejectedValueOnce(prismaError('P2025'));
      await expect(repository.update(makeProduct())).rejects.toThrow(ProductNotFoundError);

      prisma.product.update.mockRejectedValueOnce(prismaError('P2002'));
      await expect(repository.update(makeProduct())).rejects.toThrow(SkuAlreadyExistsError);
    });
  });

  describe('findById / findBySku', () => {
    it('maps a row back to an equal domain product with numeric money', async () => {
      const product = makeProduct();
      prisma.product.findUnique.mockResolvedValue(toRow(product));

      const found = await repository.findById(product.id);

      expect(found).toBeInstanceOf(Product);
      expect(found!.toPrimitives()).toEqual(product.toPrimitives());
      expect(typeof found!.toPrimitives().costPrice).toBe('number');
    });

    it('returns null when no row matches', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(repository.findById('x')).resolves.toBeNull();
      await expect(repository.findBySku('x')).resolves.toBeNull();
    });

    it('looks up the normalized SKU', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await repository.findBySku(' fert-1 ');
      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { sku: 'FERT-1' } });
    });
  });

  describe('findMany', () => {
    it('applies filters, ordering and offset paging, and counts with the same filter', async () => {
      const product = makeProduct();
      prisma.product.findMany.mockResolvedValue([toRow(product)]);
      prisma.product.count.mockResolvedValue(41);

      const page = await repository.findMany({ category: 'fertilizer', productType: 'input' }, { page: 3, limit: 20 });

      const where = { category: 'fertilizer', productType: 'input', status: undefined };
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 40,
        take: 20,
      });
      expect(prisma.product.count).toHaveBeenCalledWith({ where });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(page.total).toBe(41);
      expect(page.items[0].id).toBe(product.id);
    });
  });

  describe('delete', () => {
    it('returns true when a row was deleted and false otherwise', async () => {
      prisma.product.deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

      await expect(repository.delete('a')).resolves.toBe(true);
      await expect(repository.delete('b')).resolves.toBe(false);
      expect(prisma.product.deleteMany).toHaveBeenCalledWith({ where: { id: 'a' } });
    });
  });
});
