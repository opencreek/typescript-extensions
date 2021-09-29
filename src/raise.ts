/**
 * Throws the given exception, and `never` returns.
 * Can be used to convert a `throw new Error` to a real expression:
 *
 * ```
 * const a: Something = fetchSomething() ?? raise(new Error("not found"))
 * ```
 * @param error
 */
export function raise(error: Error): never {
    throw error
}
