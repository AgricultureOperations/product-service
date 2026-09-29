import { randomUUID } from 'node:crypto';
import { ProductValidationError } from '../errors';
import {
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  ProductStatus,
  ProductType,
  UNITS_OF_MEASURE,
  UnitOfMeasure,
} from '../value-objects';

export interface ProductProps {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  productType: ProductType;
  scientificName: string | null;
  activeIngredient: string | null;
  /** Days that must pass between applying an input (e.g. a pesticide) and harvesting. */
  safetyPeriodDays: number | null;
  isHazardous: boolean;
  unitOfMeasure: UnitOfMeasure;
  presentationSize: number | null;
  presentationUnit: UnitOfMeasure | null;
  costPrice: number;
  sellingPrice: number;
  /** Percentage, 0 to 100. */
  taxRate: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  reorderPoint: number;
  requiresBatchTracking: boolean;
  requiresExpiration: boolean;
  storageConditions: string | null;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

type RequiredOnCreate = 'sku' | 'name' | 'category' | 'productType' | 'unitOfMeasure' | 'costPrice' | 'sellingPrice';
type Managed = 'id' | 'createdAt' | 'updatedAt';

export type CreateProductProps = Pick<ProductProps, RequiredOnCreate> &
  Partial<Omit<ProductProps, RequiredOnCreate | Managed>>;

export type UpdateProductProps = Partial<Omit<ProductProps, Managed>>;

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,63}$/;
const MAX_NAME_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 100;

/**
 * Aggregate root of the product catalog. State changes only through `create` and `update`,
 * and both re-check every invariant, so an instance is always valid.
 */
export class Product {
  private constructor(private props: ProductProps) {}

  static create(input: CreateProductProps, now: Date = new Date()): Product {
    const props = Product.normalize({
      description: null,
      scientificName: null,
      activeIngredient: null,
      safetyPeriodDays: null,
      isHazardous: false,
      presentationSize: null,
      presentationUnit: null,
      taxRate: 0,
      minStockLevel: 0,
      maxStockLevel: null,
      reorderPoint: 0,
      requiresBatchTracking: false,
      requiresExpiration: false,
      storageConditions: null,
      status: 'active',
      ...Product.withoutUndefined(input),
      sku: input.sku,
      name: input.name,
      category: input.category,
      productType: input.productType,
      unitOfMeasure: input.unitOfMeasure,
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    Product.validate(props);
    return new Product(props);
  }

  /** Rebuilds a product loaded from persistence. Skips validation: stored rows were valid when written. */
  static restore(props: ProductProps): Product {
    return new Product({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get sku(): string {
    return this.props.sku;
  }

  update(changes: UpdateProductProps, now: Date = new Date()): void {
    const next = Product.normalize({ ...this.props, ...Product.withoutUndefined(changes), updatedAt: now });
    Product.validate(next);
    this.props = next;
  }

  toPrimitives(): ProductProps {
    return { ...this.props };
  }

  /** Normalizes a SKU the same way `create` and `update` do, so lookups match stored values. */
  static normalizeSku(sku: string): string {
    return sku.trim().toUpperCase();
  }

  private static normalize(props: ProductProps): ProductProps {
    return {
      ...props,
      sku: Product.normalizeSku(props.sku),
      name: props.name.trim(),
      category: props.category.trim().toLowerCase(),
      description: Product.blankToNull(props.description),
      scientificName: Product.blankToNull(props.scientificName),
      activeIngredient: Product.blankToNull(props.activeIngredient),
      storageConditions: Product.blankToNull(props.storageConditions),
    };
  }

  private static validate(p: ProductProps): void {
    const fail = (message: string): never => {
      throw new ProductValidationError(message);
    };

    if (!SKU_PATTERN.test(p.sku)) {
      fail('sku must be 1-64 characters: letters, digits, ".", "_" or "-", starting with a letter or digit');
    }
    if (p.name.length === 0 || p.name.length > MAX_NAME_LENGTH) {
      fail(`name must be 1-${MAX_NAME_LENGTH} characters`);
    }
    if (p.category.length === 0 || p.category.length > MAX_CATEGORY_LENGTH) {
      fail(`category must be 1-${MAX_CATEGORY_LENGTH} characters`);
    }
    if (!PRODUCT_TYPES.includes(p.productType)) {
      fail(`productType must be one of: ${PRODUCT_TYPES.join(', ')}`);
    }
    if (!PRODUCT_STATUSES.includes(p.status)) {
      fail(`status must be one of: ${PRODUCT_STATUSES.join(', ')}`);
    }
    if (!UNITS_OF_MEASURE.includes(p.unitOfMeasure)) {
      fail(`unitOfMeasure must be one of: ${UNITS_OF_MEASURE.join(', ')}`);
    }
    if (p.presentationUnit !== null && !UNITS_OF_MEASURE.includes(p.presentationUnit)) {
      fail(`presentationUnit must be one of: ${UNITS_OF_MEASURE.join(', ')}`);
    }
    if ((p.presentationSize === null) !== (p.presentationUnit === null)) {
      fail('presentationSize and presentationUnit must be set together');
    }
    if (p.presentationSize !== null && !(p.presentationSize > 0)) {
      fail('presentationSize must be greater than 0');
    }
    if (!Product.isNonNegative(p.costPrice)) fail('costPrice must be 0 or greater');
    if (!Product.isNonNegative(p.sellingPrice)) fail('sellingPrice must be 0 or greater');
    if (!Product.isNonNegative(p.taxRate) || p.taxRate > 100) fail('taxRate must be between 0 and 100');
    if (p.safetyPeriodDays !== null && !Product.isNonNegativeInt(p.safetyPeriodDays)) {
      fail('safetyPeriodDays must be a whole number, 0 or greater');
    }
    if (!Product.isNonNegativeInt(p.minStockLevel)) fail('minStockLevel must be a whole number, 0 or greater');
    if (!Product.isNonNegativeInt(p.reorderPoint)) fail('reorderPoint must be a whole number, 0 or greater');
    if (p.maxStockLevel !== null) {
      if (!Product.isNonNegativeInt(p.maxStockLevel)) fail('maxStockLevel must be a whole number, 0 or greater');
      if (p.maxStockLevel < p.minStockLevel) fail('maxStockLevel must be greater than or equal to minStockLevel');
      if (p.reorderPoint > p.maxStockLevel) fail('reorderPoint must be less than or equal to maxStockLevel');
    }
    if (p.reorderPoint < p.minStockLevel) fail('reorderPoint must be greater than or equal to minStockLevel');
  }

  private static isNonNegative(value: number): boolean {
    return Number.isFinite(value) && value >= 0;
  }

  private static isNonNegativeInt(value: number): boolean {
    return Number.isInteger(value) && value >= 0;
  }

  private static blankToNull(value: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  /** Drops keys whose value is `undefined`, so a partial update never overwrites a field with it. */
  private static withoutUndefined<T extends object>(input: T): Partial<T> {
    return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as Partial<T>;
  }
}
