import { makeProduct } from '../../../test/support/product.fixtures';
import { mockProductRepository } from '../../../test/support/mock-product.repository';
import { ProductNotFoundError } from '../../domain';
import { GetProductByIdUseCase } from './get-product-by-id.use-case';

describe('GetProductByIdUseCase', () => {
  let repository: ReturnType<typeof mockProductRepository>;
  let useCase: GetProductByIdUseCase;

  beforeEach(() => {
    repository = mockProductRepository();
    useCase = new GetProductByIdUseCase(repository);
  });

  it('returns the product as a response DTO', async () => {
    const product = makeProduct({}, new Date('2026-03-01T12:00:00Z'));
    repository.findById.mockResolvedValue(product);

    const result = await useCase.execute(product.id);

    expect(repository.findById).toHaveBeenCalledWith(product.id);
    expect(result).toMatchObject({ id: product.id, sku: product.sku, createdAt: '2026-03-01T12:00:00.000Z' });
  });

  it('throws ProductNotFoundError when the id is unknown', async () => {
    await expect(useCase.execute('0b0e5a8c-3f3a-4d0e-9d7e-4d3c5a1f2b6e')).rejects.toThrow(ProductNotFoundError);
  });
});
