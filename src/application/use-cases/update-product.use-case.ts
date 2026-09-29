import { IProductRepository, Product, ProductNotFoundError, SkuAlreadyExistsError } from '../../domain';
import { ProductResponseDto, UpdateProductDto } from '../dtos';

export class UpdateProductUseCase {
  constructor(private readonly products: IProductRepository) {}

  async execute(id: string, changes: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }

    if (changes.sku !== undefined) {
      const sku = Product.normalizeSku(changes.sku);
      const owner = sku === product.sku ? null : await this.products.findBySku(sku);
      if (owner) {
        throw new SkuAlreadyExistsError(sku);
      }
    }

    product.update(changes);
    await this.products.update(product);
    return ProductResponseDto.fromEntity(product);
  }
}
