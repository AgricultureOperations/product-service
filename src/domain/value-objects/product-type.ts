export const PRODUCT_TYPES = ['harvest', 'input', 'equipment'] as const;

/** harvest: crops produced (bananas, cocoa, grains). input: fertilizers, pesticides, seeds. equipment: tools and machinery. */
export type ProductType = (typeof PRODUCT_TYPES)[number];
