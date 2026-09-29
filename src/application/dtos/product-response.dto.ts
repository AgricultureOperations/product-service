import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  Product,
  ProductStatus,
  ProductType,
  UNITS_OF_MEASURE,
  UnitOfMeasure,
} from '../../domain';

/** Wire shape of a product. Kept separate from the entity so domain refactors don't change the API. */
export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() sku: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ type: String, nullable: true }) description: string | null;
  @ApiProperty() category: string;
  @ApiProperty({ enum: PRODUCT_TYPES }) productType: ProductType;
  @ApiPropertyOptional({ type: String, nullable: true }) scientificName: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) activeIngredient: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) safetyPeriodDays: number | null;
  @ApiProperty() isHazardous: boolean;
  @ApiProperty({ enum: UNITS_OF_MEASURE }) unitOfMeasure: UnitOfMeasure;
  @ApiPropertyOptional({ type: Number, nullable: true }) presentationSize: number | null;
  @ApiPropertyOptional({ enum: UNITS_OF_MEASURE, nullable: true }) presentationUnit: UnitOfMeasure | null;
  @ApiProperty() costPrice: number;
  @ApiProperty() sellingPrice: number;
  @ApiProperty({ description: 'Percentage' }) taxRate: number;
  @ApiProperty() minStockLevel: number;
  @ApiPropertyOptional({ type: Number, nullable: true }) maxStockLevel: number | null;
  @ApiProperty() reorderPoint: number;
  @ApiProperty() requiresBatchTracking: boolean;
  @ApiProperty() requiresExpiration: boolean;
  @ApiPropertyOptional({ type: String, nullable: true }) storageConditions: string | null;
  @ApiProperty({ enum: PRODUCT_STATUSES }) status: ProductStatus;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;

  static fromEntity(product: Product): ProductResponseDto {
    const p = product.toPrimitives();
    return Object.assign(new ProductResponseDto(), {
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    });
  }
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 57 }) total: number;
  @ApiProperty({ example: 3 }) totalPages: number;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] }) data: ProductResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}
