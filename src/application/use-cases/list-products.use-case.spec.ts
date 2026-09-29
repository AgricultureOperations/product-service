import { InMemoryProductRepository } from '../../../test/support/in-memory-product.repository';
import { cocoaProps, fertilizerProps } from '../../../test/support/product.fixtures';
import { mockProductRepository } from '../../../test/support/mock-product.repository';
import { Product } from '../../domain';
import { ListProductsQueryDto } from '../dtos';
import { ListProductsUseCase } from './list-products.use-case';

const query = (overrides: Partial<ListProductsQueryDto> = {}): ListProductsQueryDto =>
  Object.assign(new ListProductsQueryDto(), overrides);

describe('ListProductsUseCase', () => {
  it('passes filters and paging to the repository', async () => {
    const repository = mockProductRepository();
    await new ListProductsUseCase(repository).execute(
      query({ page: 2, limit: 10, category: 'fertilizer', productType: 'input', status: 'active' }),
    );

    expect(repository.findMany).toHaveBeenCalledWith(
      { category: 'fertilizer', productType: 'input', status: 'active' },
      { page: 2, limit: 10 },
    );
  });

  describe('with an in-memory repository', () => {
    let repository: InMemoryProductRepository;
    let useCase: ListProductsUseCase;

    beforeEach(async () => {
      repository = new InMemoryProductRepository();
      useCase = new ListProductsUseCase(repository);

      const day = (d: number) => new Date(`2026-01-${String(d).padStart(2, '0')}T00:00:00Z`);
      await repository.create(Product.create(fertilizerProps({ sku: 'FERT-1' }), day(1)));
      await repository.create(Product.create(fertilizerProps({ sku: 'FERT-2', status: 'inactive' }), day(2)));
      await repository.create(Product.create(fertilizerProps({ sku: 'PEST-1', category: 'pesticide' }), day(3)));
      await repository.create(Product.create(cocoaProps({ sku: 'COCOA-1' }), day(4)));
      await repository.create(Product.create(cocoaProps({ sku: 'COCOA-2', status: 'discontinued' }), day(5)));
    });

    it('returns the first page, newest first, with pagination metadata', async () => {
      const result = await useCase.execute(query({ page: 1, limit: 2 }));

      expect(result.data.map((p) => p.sku)).toEqual(['COCOA-2', 'COCOA-1']);
      expect(result.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    });

    it('returns a later page', async () => {
      const result = await useCase.execute(query({ page: 3, limit: 2 }));
      expect(result.data.map((p) => p.sku)).toEqual(['FERT-1']);
    });

    it('returns an empty page past the end', async () => {
      const result = await useCase.execute(query({ page: 9, limit: 2 }));
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(5);
    });

    it('filters by category', async () => {
      const result = await useCase.execute(query({ category: 'pesticide' }));
      expect(result.data.map((p) => p.sku)).toEqual(['PEST-1']);
    });

    it('filters by productType', async () => {
      const result = await useCase.execute(query({ productType: 'harvest' }));
      expect(result.data.map((p) => p.sku)).toEqual(['COCOA-2', 'COCOA-1']);
    });

    it('filters by status', async () => {
      const result = await useCase.execute(query({ status: 'active' }));
      expect(result.data.map((p) => p.sku)).toEqual(['COCOA-1', 'PEST-1', 'FERT-1']);
    });

    it('combines filters', async () => {
      const result = await useCase.execute(query({ productType: 'input', category: 'fertilizer', status: 'inactive' }));
      expect(result.data.map((p) => p.sku)).toEqual(['FERT-2']);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('reports zero pages when nothing matches', async () => {
      const result = await useCase.execute(query({ category: 'seed' }));
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });
  });
});
