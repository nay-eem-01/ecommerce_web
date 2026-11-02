/**
 * A failed API call. `message` is the backend's envelope message, written to be shown to the shopper;
 * `correlationId` matches a server log line (quote it in bug reports); `payload` carries details some errors
 * have (409 out of stock: `{ productIds }`).
 */
export class ApiError extends Error {
  readonly status: number
  readonly correlationId: string | null
  readonly payload: unknown

  constructor(status: number, message: string, correlationId: string | null = null, payload: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.correlationId = correlationId
    this.payload = payload
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isNotFound(): boolean {
    return this.status === 404
  }
}

export const NETWORK_ERROR_MESSAGE = "Can't reach Senpai Supply right now. Check your connection and try again."
export const SERVER_ERROR_MESSAGE = 'Something went wrong on our side. Please try again.'

/** A message to show for anything thrown by a query or mutation. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SERVER_ERROR_MESSAGE
}
