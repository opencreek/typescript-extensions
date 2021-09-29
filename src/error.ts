/**
 * error will throw an error with the given message, if any
 * @param msg - The error message
 */
export function error(
    msg?: string
): never {
    throw new Error(msg)
}
