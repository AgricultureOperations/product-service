import { Product } from '../entities/product.entity';
import { ProductStatus, ProductType } from '../value-objects';

/** Injection token for the driven port. Bound to an adapter in `ProductModule`. */
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductFilter {
  category?: string;
  productType?: ProductType;
  status?: ProductStatus;
}

export interface PageRequest {
  /** 1-based. */
  page: number;
  limit: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}

/**
 * Driven (outbound) port for product persistence.
 * Adapters throw `SkuAlreadyExistsError` when a write hits the unique SKU constraint.
 */
export interface IProductRepository {
  create(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  /** Newest first. */
  findMany(filter: ProductFilter, page: PageRequest): Promise<Page<Product>>;
  /** Returns false when no product has that id. */
  delete(id: string): Promise<boolean>;
}
