/** Base class for errors the interface layer maps to HTTP status codes. */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A product would break one of its invariants. Maps to 400. */
export class ProductValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** Maps to 404. */
export class ProductNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Product ${id} not found`);
  }
}

/** Maps to 409. */
export class SkuAlreadyExistsError extends DomainError {
  constructor(sku: string) {
    super(`A product with SKU ${sku} already exists`);
  }
}
