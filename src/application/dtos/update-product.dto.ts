import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * Every field is optional. An absent field is left unchanged. `null` clears a nullable field
 * and is rejected for a non-nullable one (`skipNullProperties: false`).
 */
export class UpdateProductDto extends PartialType(CreateProductDto, { skipNullProperties: false }) {}
