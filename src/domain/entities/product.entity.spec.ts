import { cocoaProps, fertilizerProps } from '../../../test/support/product.fixtures';
import { ProductValidationError } from '../errors';
import { Product } from './product.entity';

describe('Product entity', () => {
  describe('create', () => {
    it('assigns an id, timestamps and the given fields', () => {
      const now = new Date('2026-01-15T10:00:00Z');
      const product = Product.create(fertilizerProps(), now).toPrimitives();

      expect(product.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(product.createdAt).toEqual(now);
      expect(product.updatedAt).toEqual(now);
      expect(product).toMatchObject({ sku: 'FERT-UREA-50KG', productType: 'input', costPrice: 28.5, taxRate: 15 });
    });

    it('applies defaults to optional fields', () => {
      const product = Product.create(cocoaProps()).toPrimitives();

      expect(product).toMatchObject({
        description: null,
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
      });
    });

    it('ignores explicitly undefined optional fields instead of overwriting defaults', () => {
      const product = Product.create(cocoaProps({ status: undefined, taxRate: undefined })).toPrimitives();
      expect(product.status).toBe('active');
      expect(product.taxRate).toBe(0);
    });

    it('normalizes sku, name, category and blank optional text', () => {
      const product = Product.create(
        fertilizerProps({ sku: '  fert-urea-50kg ', name: '  Urea ', category: ' Fertilizer ', description: '   ' }),
      ).toPrimitives();

      expect(product.sku).toBe('FERT-UREA-50KG');
      expect(product.name).toBe('Urea');
      expect(product.category).toBe('fertilizer');
      expect(product.description).toBeNull();
    });

    it('generates a different id for each product', () => {
      expect(Product.create(cocoaProps()).id).not.toBe(Product.create(cocoaProps()).id);
    });

    it.each([
      ['an invalid sku', { sku: 'bad sku!' }, /sku/],
      ['an empty name', { name: '   ' }, /name/],
      ['an empty category', { category: '' }, /category/],
      ['an unknown productType', { productType: 'seedling' as never }, /productType/],
      ['an unknown status', { status: 'archived' as never }, /status/],
      ['an unknown unitOfMeasure', { unitOfMeasure: 'crate' as never }, /unitOfMeasure/],
      ['a negative costPrice', { costPrice: -1 }, /costPrice/],
      ['a negative sellingPrice', { sellingPrice: -0.01 }, /sellingPrice/],
      ['a non-finite price', { sellingPrice: Number.NaN }, /sellingPrice/],
      ['a taxRate above 100', { taxRate: 101 }, /taxRate/],
      ['a fractional safetyPeriodDays', { safetyPeriodDays: 1.5 }, /safetyPeriodDays/],
      ['a negative minStockLevel', { minStockLevel: -1, reorderPoint: 0 }, /minStockLevel/],
      ['maxStockLevel below minStockLevel', { minStockLevel: 50, maxStockLevel: 40, reorderPoint: 50 }, /maxStockLevel/],
      ['reorderPoint above maxStockLevel', { reorderPoint: 300 }, /reorderPoint/],
      ['reorderPoint below minStockLevel', { reorderPoint: 5 }, /reorderPoint/],
      ['presentationSize without a unit', { presentationUnit: null }, /presentationSize and presentationUnit/],
      ['a zero presentationSize', { presentationSize: 0 }, /presentationSize/],
    ])('rejects %s', (_label, overrides, message) => {
      expect(() => Product.create(fertilizerProps(overrides))).toThrow(ProductValidationError);
      expect(() => Product.create(fertilizerProps(overrides))).toThrow(message);
    });

    it('allows no maxStockLevel', () => {
      expect(() => Product.create(fertilizerProps({ maxStockLevel: null, reorderPoint: 1000 }))).not.toThrow();
    });
  });

  describe('update', () => {
    it('changes the given fields, keeps the rest and bumps updatedAt', () => {
      const created = new Date('2026-01-01T00:00:00Z');
      const later = new Date('2026-02-01T00:00:00Z');
      const product = Product.create(fertilizerProps(), created);

      product.update({ sellingPrice: 36, status: 'inactive' }, later);
      const p = product.toPrimitives();

      expect(p.sellingPrice).toBe(36);
      expect(p.status).toBe('inactive');
      expect(p.costPrice).toBe(28.5);
      expect(p.createdAt).toEqual(created);
      expect(p.updatedAt).toEqual(later);
    });

    it('clears a nullable field when given null', () => {
      const product = Product.create(fertilizerProps());
      product.update({ presentationSize: null, presentationUnit: null, maxStockLevel: null });

      expect(product.toPrimitives()).toMatchObject({ presentationSize: null, presentationUnit: null, maxStockLevel: null });
    });

    it('ignores undefined fields', () => {
      const product = Product.create(fertilizerProps());
      product.update({ name: undefined });
      expect(product.toPrimitives().name).toBe('Urea 46% N');
    });

    it('rejects a change that breaks an invariant and leaves the product unchanged', () => {
      const product = Product.create(fertilizerProps());
      const before = product.toPrimitives();

      expect(() => product.update({ maxStockLevel: 5 })).toThrow(ProductValidationError);
      expect(product.toPrimitives()).toEqual(before);
    });
  });

  describe('restore', () => {
    it('rebuilds an equal product without changing it', () => {
      const original = Product.create(fertilizerProps()).toPrimitives();
      expect(Product.restore(original).toPrimitives()).toEqual(original);
    });
  });

  it('toPrimitives returns a copy', () => {
    const product = Product.create(fertilizerProps());
    product.toPrimitives().name = 'changed';
    expect(product.toPrimitives().name).toBe('Urea 46% N');
  });
});
