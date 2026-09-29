export const PRODUCT_STATUSES = ['active', 'inactive', 'discontinued'] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
