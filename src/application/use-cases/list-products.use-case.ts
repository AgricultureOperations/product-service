import { IProductRepository } from '../../domain';
import { ListProductsQueryDto, PaginatedProductsResponseDto, ProductResponseDto } from '../dtos';

export class ListProductsUseCase {
  constructor(private readonly products: IProductRepository) {}

  async execute(query: ListProductsQueryDto): Promise<PaginatedProductsResponseDto> {
    const { page, limit, category, productType, status } = query;
    const { items, total } = await this.products.findMany({ category, productType, status }, { page, limit });

    return {
      data: items.map((product) => ProductResponseDto.fromEntity(product)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
