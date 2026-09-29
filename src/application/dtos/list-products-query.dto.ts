import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PRODUCT_STATUSES, PRODUCT_TYPES, ProductStatus, ProductType } from '../../domain';

export const MAX_PAGE_SIZE = 100;

export class ListProductsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: MAX_PAGE_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = 20;

  @ApiPropertyOptional({ example: 'fertilizer', description: 'Case-insensitive exact match' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ enum: PRODUCT_TYPES })
  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  productType?: ProductType;

  @ApiPropertyOptional({ enum: PRODUCT_STATUSES })
  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: ProductStatus;
}
