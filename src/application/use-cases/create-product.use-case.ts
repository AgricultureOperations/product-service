import { IProductRepository, Product, SkuAlreadyExistsError } from '../../domain';
import { CreateProductDto, ProductResponseDto } from '../dtos';

export class CreateProductUseCase {
  constructor(private readonly products: IProductRepository) {}

  async execute(input: CreateProductDto): Promise<ProductResponseDto> {
    const product = Product.create(input);

    // Fails fast with a clear error. The unique index still guards against concurrent creates.
    if (await this.products.findBySku(product.sku)) {
      throw new SkuAlreadyExistsError(product.sku);
    }

    await this.products.create(product);
    return ProductResponseDto.fromEntity(product);
  }
}
