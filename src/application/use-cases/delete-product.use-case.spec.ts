import { mockProductRepository } from '../../../test/support/mock-product.repository';
import { ProductNotFoundError } from '../../domain';
import { DeleteProductUseCase } from './delete-product.use-case';

describe('DeleteProductUseCase', () => {
  const id = '0b0e5a8c-3f3a-4d0e-9d7e-4d3c5a1f2b6e';

  it('deletes an existing product', async () => {
    const repository = mockProductRepository();
    await expect(new DeleteProductUseCase(repository).execute(id)).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith(id);
  });

  it('throws ProductNotFoundError when nothing was deleted', async () => {
    const repository = mockProductRepository();
    repository.delete.mockResolvedValue(false);
    await expect(new DeleteProductUseCase(repository).execute(id)).rejects.toThrow(ProductNotFoundError);
  });
});
