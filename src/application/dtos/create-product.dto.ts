import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  ProductStatus,
  ProductType,
  UNITS_OF_MEASURE,
  UnitOfMeasure,
} from '../../domain';
import { IsOptionalNotNull } from './validation.decorators';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const MONEY = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };

export class CreateProductDto {
  @ApiProperty({ example: 'FERT-UREA-50KG', description: 'Unique. Stored upper-case.', maxLength: 64 })
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message: 'sku may contain only letters, digits, ".", "_" or "-", and must start with a letter or digit',
  })
  @MaxLength(64)
  sku: string;

  @ApiProperty({ example: 'Urea 46% N', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Granular nitrogen fertilizer', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ example: 'fertilizer', description: 'Free text. Stored lower-case.', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiProperty({ enum: PRODUCT_TYPES, example: 'input' })
  @IsIn(PRODUCT_TYPES)
  productType: ProductType;

  @ApiPropertyOptional({ example: 'Theobroma cacao', nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  scientificName?: string | null;

  @ApiPropertyOptional({ example: 'Urea', nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  activeIngredient?: string | null;

  @ApiPropertyOptional({ example: 14, nullable: true, description: 'Days between application and harvest' })
  @IsOptional()
  @IsInt()
  @Min(0)
  safetyPeriodDays?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptionalNotNull()
  @IsBoolean()
  isHazardous?: boolean;

  @ApiProperty({ enum: UNITS_OF_MEASURE, example: 'bag' })
  @IsIn(UNITS_OF_MEASURE)
  unitOfMeasure: UnitOfMeasure;

  @ApiPropertyOptional({ example: 50, nullable: true, description: 'Set together with presentationUnit' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3, allowNaN: false, allowInfinity: false })
  @IsPositive()
  presentationSize?: number | null;

  @ApiPropertyOptional({ enum: UNITS_OF_MEASURE, example: 'kg', nullable: true })
  @IsOptional()
  @IsIn(UNITS_OF_MEASURE)
  presentationUnit?: UnitOfMeasure | null;

  @ApiProperty({ example: 28.5, minimum: 0 })
  @IsNumber(MONEY)
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 34.9, minimum: 0 })
  @IsNumber(MONEY)
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ example: 15, default: 0, minimum: 0, maximum: 100, description: 'Percentage' })
  @IsOptionalNotNull()
  @IsNumber(MONEY)
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ example: 10, default: 0, minimum: 0 })
  @IsOptionalNotNull()
  @IsInt()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional({ example: 200, nullable: true, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStockLevel?: number | null;

  @ApiPropertyOptional({ example: 25, default: 0, minimum: 0, description: 'Between minStockLevel and maxStockLevel' })
  @IsOptionalNotNull()
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptionalNotNull()
  @IsBoolean()
  requiresBatchTracking?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptionalNotNull()
  @IsBoolean()
  requiresExpiration?: boolean;

  @ApiPropertyOptional({ example: 'Dry place, away from sunlight', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  storageConditions?: string | null;

  @ApiPropertyOptional({ enum: PRODUCT_STATUSES, default: 'active' })
  @IsOptionalNotNull()
  @IsIn(PRODUCT_STATUSES)
  status?: ProductStatus;
}
