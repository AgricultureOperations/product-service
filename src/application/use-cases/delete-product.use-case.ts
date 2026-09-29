import { IProductRepository, ProductNotFoundError } from '../../domain';

/** Removes the product permanently. To retire a product but keep its history, set `status` to `discontinued`. */
export class DeleteProductUseCase {
  constructor(private readonly products: IProductRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.products.delete(id);
    if (!deleted) {
      throw new ProductNotFoundError(id);
    }
  }
}
