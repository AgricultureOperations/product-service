import {
  IProductRepository,
  Page,
  PageRequest,
  Product,
  ProductFilter,
  ProductNotFoundError,
  SkuAlreadyExistsError,
} from '../../src/domain';

/** Test double for the repository port. Mirrors the Prisma adapter's contract, including the unique SKU. */
export class InMemoryProductRepository implements IProductRepository {
  private readonly rows = new Map<string, Product>();

  async create(product: Product): Promise<void> {
    this.assertSkuFree(product);
    this.rows.set(product.id, this.copy(product));
  }

  async update(product: Product): Promise<void> {
    if (!this.rows.has(product.id)) throw new ProductNotFoundError(product.id);
    this.assertSkuFree(product);
    this.rows.set(product.id, this.copy(product));
  }

  async findById(id: string): Promise<Product | null> {
    const product = this.rows.get(id);
    return product ? this.copy(product) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const normalized = Product.normalizeSku(sku);
    const product = [...this.rows.values()].find((p) => p.sku === normalized);
    return product ? this.copy(product) : null;
  }

  async findMany(filter: ProductFilter, { page, limit }: PageRequest): Promise<Page<Product>> {
    const matches = [...this.rows.values()]
      .map((p) => p.toPrimitives())
      .filter(
        (p) =>
          (filter.category === undefined || p.category === filter.category) &&
          (filter.productType === undefined || p.productType === filter.productType) &&
          (filter.status === undefined || p.status === filter.status),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));

    return {
      items: matches.slice((page - 1) * limit, page * limit).map((p) => Product.restore(p)),
      total: matches.length,
    };
  }

  async delete(id: string): Promise<boolean> {
    return this.rows.delete(id);
  }

  private assertSkuFree(product: Product): void {
    const clash = [...this.rows.values()].find((p) => p.sku === product.sku && p.id !== product.id);
    if (clash) throw new SkuAlreadyExistsError(product.sku);
  }

  /** Stores and returns copies, so callers can't mutate stored state without calling update(). */
  private copy(product: Product): Product {
    return Product.restore(product.toPrimitives());
  }
}
