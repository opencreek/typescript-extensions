import { format } from "./strings"

/**
 * error will throw an error with the given message, if any
 * @param msg - The error message
 */
export function error(msg?: string, ...args: any | undefined | null): never {
  const str = format(msg ?? "", ...args)
  throw new Error(str)
}
