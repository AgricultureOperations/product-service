import { makeProduct } from '../../../test/support/product.fixtures';
import { mockProductRepository } from '../../../test/support/mock-product.repository';
import { ProductNotFoundError, ProductValidationError, SkuAlreadyExistsError } from '../../domain';
import { UpdateProductUseCase } from './update-product.use-case';

describe('UpdateProductUseCase', () => {
  let repository: ReturnType<typeof mockProductRepository>;
  let useCase: UpdateProductUseCase;

  beforeEach(() => {
    repository = mockProductRepository();
    useCase = new UpdateProductUseCase(repository);
  });

  it('applies the changes, persists and returns the product', async () => {
    const product = makeProduct();
    repository.findById.mockResolvedValue(product);

    const result = await useCase.execute(product.id, { sellingPrice: 40, status: 'inactive' });

    expect(repository.update).toHaveBeenCalledWith(product);
    expect(result).toMatchObject({ id: product.id, sellingPrice: 40, status: 'inactive', costPrice: 28.5 });
  });

  it('throws ProductNotFoundError for an unknown id', async () => {
    await expect(useCase.execute('0b0e5a8c-3f3a-4d0e-9d7e-4d3c5a1f2b6e', { name: 'x' })).rejects.toThrow(
      ProductNotFoundError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects a SKU that belongs to another product', async () => {
    repository.findById.mockResolvedValue(makeProduct());
    repository.findBySku.mockResolvedValue(makeProduct({ sku: 'OTHER-SKU' }));

    await expect(useCase.execute('id', { sku: 'other-sku' })).rejects.toThrow(SkuAlreadyExistsError);
    expect(repository.findBySku).toHaveBeenCalledWith('OTHER-SKU');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('allows re-sending the current SKU in a different case without a lookup', async () => {
    const product = makeProduct();
    repository.findById.mockResolvedValue(product);

    await useCase.execute(product.id, { sku: 'fert-urea-50kg' });

    expect(repository.findBySku).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalled();
  });

  it('rejects changes that break an invariant', async () => {
    repository.findById.mockResolvedValue(makeProduct());

    await expect(useCase.execute('id', { minStockLevel: 500 })).rejects.toThrow(ProductValidationError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
