import { CreateProductProps, Product } from '../../src/domain';

/** A valid agricultural input. Override any field per test. */
export function fertilizerProps(overrides: Partial<CreateProductProps> = {}): CreateProductProps {
  return {
    sku: 'FERT-UREA-50KG',
    name: 'Urea 46% N',
    description: 'Granular nitrogen fertilizer',
    category: 'fertilizer',
    productType: 'input',
    activeIngredient: 'Urea',
    safetyPeriodDays: 0,
    isHazardous: false,
    unitOfMeasure: 'bag',
    presentationSize: 50,
    presentationUnit: 'kg',
    costPrice: 28.5,
    sellingPrice: 34.9,
    taxRate: 15,
    minStockLevel: 10,
    maxStockLevel: 200,
    reorderPoint: 25,
    requiresBatchTracking: true,
    requiresExpiration: false,
    storageConditions: 'Dry place, away from sunlight',
    ...overrides,
  };
}

/** A valid harvested crop. */
export function cocoaProps(overrides: Partial<CreateProductProps> = {}): CreateProductProps {
  return {
    sku: 'HARV-COCOA-CCN51',
    name: 'Cocoa beans CCN-51',
    category: 'cocoa',
    productType: 'harvest',
    scientificName: 'Theobroma cacao',
    unitOfMeasure: 'qq',
    costPrice: 90,
    sellingPrice: 120,
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<CreateProductProps> = {}, now?: Date): Product {
  return Product.create(fertilizerProps(overrides), now);
}
