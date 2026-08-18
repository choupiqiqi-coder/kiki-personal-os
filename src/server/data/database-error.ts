export class DataAccessError extends Error {
  constructor(
    message: string,
    readonly operation: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DataAccessError";
  }
}

export function throwDataAccessError(
  operation: string,
  error: { message: string },
): never {
  throw new DataAccessError(error.message, operation);
}
