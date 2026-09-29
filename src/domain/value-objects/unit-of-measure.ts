/**
 * Units used for stock (unitOfMeasure) and packaging (presentationUnit).
 * qq = quintal (45.36 kg / 100 lb), common for cocoa and grains.
 * Stored as text, so appending a unit needs no migration. Never rename one.
 */
export const UNITS_OF_MEASURE = ['kg', 'g', 'lb', 'qq', 't', 'l', 'ml', 'gal', 'unit', 'box', 'bag'] as const;

export type UnitOfMeasure = (typeof UNITS_OF_MEASURE)[number];
