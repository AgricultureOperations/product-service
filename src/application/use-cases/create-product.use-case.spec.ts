import { fertilizerProps, makeProduct } from '../../../test/support/product.fixtures';
import { mockProductRepository } from '../../../test/support/mock-product.repository';
import { Product, ProductValidationError, SkuAlreadyExistsError } from '../../domain';
import { CreateProductDto } from '../dtos';
import { CreateProductUseCase } from './create-product.use-case';

describe('CreateProductUseCase', () => {
  let repository: ReturnType<typeof mockProductRepository>;
  let useCase: CreateProductUseCase;

  beforeEach(() => {
    repository = mockProductRepository();
    useCase = new CreateProductUseCase(repository);
  });

  it('persists a new product and returns it', async () => {
    const result = await useCase.execute(fertilizerProps() as CreateProductDto);

    expect(repository.create).toHaveBeenCalledTimes(1);
    const saved = repository.create.mock.calls[0][0];
    expect(saved).toBeInstanceOf(Product);
    expect(result.id).toBe(saved.id);
    expect(result).toMatchObject({ sku: 'FERT-UREA-50KG', name: 'Urea 46% N', status: 'active' });
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('checks SKU uniqueness using the normalized SKU', async () => {
    await useCase.execute(fertilizerProps({ sku: 'fert-urea-50kg' }) as CreateProductDto);
    expect(repository.findBySku).toHaveBeenCalledWith('FERT-UREA-50KG');
  });

  it('rejects a duplicate SKU without writing', async () => {
    repository.findBySku.mockResolvedValue(makeProduct());

    await expect(useCase.execute(fertilizerProps() as CreateProductDto)).rejects.toThrow(SkuAlreadyExistsError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects invalid data before touching the repository', async () => {
    await expect(useCase.execute(fertilizerProps({ reorderPoint: 500 }) as CreateProductDto)).rejects.toThrow(
      ProductValidationError,
    );
    expect(repository.findBySku).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('propagates a SKU conflict raised by the repository (concurrent create)', async () => {
    repository.create.mockRejectedValue(new SkuAlreadyExistsError('FERT-UREA-50KG'));
    await expect(useCase.execute(fertilizerProps() as CreateProductDto)).rejects.toThrow(SkuAlreadyExistsError);
  });
});
