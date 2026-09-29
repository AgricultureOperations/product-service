import { Prisma, Product as ProductRow } from '@prisma/client';
import { Product, UnitOfMeasure } from '../../domain';

/** Converts between the domain entity and Prisma rows. Decimals become numbers in the domain. */
export const ProductMapper = {
  toDomain(row: ProductRow): Product {
    return Product.restore({
      ...row,
      unitOfMeasure: row.unitOfMeasure as UnitOfMeasure,
      presentationUnit: row.presentationUnit as UnitOfMeasure | null,
      presentationSize: row.presentationSize === null ? null : row.presentationSize.toNumber(),
      costPrice: row.costPrice.toNumber(),
      sellingPrice: row.sellingPrice.toNumber(),
      taxRate: row.taxRate.toNumber(),
    });
  },

  toPersistence(product: Product): Prisma.ProductCreateInput {
    const p = product.toPrimitives();
    return {
      ...p,
      presentationSize: p.presentationSize === null ? null : new Prisma.Decimal(p.presentationSize),
      costPrice: new Prisma.Decimal(p.costPrice),
      sellingPrice: new Prisma.Decimal(p.sellingPrice),
      taxRate: new Prisma.Decimal(p.taxRate),
    };
  },
};
