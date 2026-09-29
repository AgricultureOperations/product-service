import { ValidateIf } from 'class-validator';

/**
 * Optional, but not nullable: skips validation only when the field is absent.
 * `@IsOptional()` also skips `null`, which would let `{ "name": null }` reach the domain.
 */
export function IsOptionalNotNull(): PropertyDecorator {
  return ValidateIf((_object, value) => value !== undefined);
}
