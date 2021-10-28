/**
 * Indicated that the code path that was reached is not yet implemented
 */
export class NotYetImplementedError extends Error {}

/**
 * TODO will throw an error with the message "TODO" (or a custom message).
 * This can be used for testing incomplete functions so that typescript won't
 * complain about missing return paths.
 * @param msg - The message
 */
export function TODO(msg?: string): never {
  throw new NotYetImplementedError(msg ?? "TODO")
}
