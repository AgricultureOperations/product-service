import { IProductRepository, ProductNotFoundError } from '../../domain';
import { ProductResponseDto } from '../dtos';

export class GetProductByIdUseCase {
  constructor(private readonly products: IProductRepository) {}

  async execute(id: string): Promise<ProductResponseDto> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return ProductResponseDto.fromEntity(product);
  }
}
