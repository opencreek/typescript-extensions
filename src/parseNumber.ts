export function undefinedIfNaN(n: number): number | undefined {
  if (isNaN(n)) {
    return undefined
  }

  return n
}

export function parseIntOrUndefined(
  s: string,
  radix?: number
): number | undefined {
  return undefinedIfNaN(parseInt(s, radix))
}

export function parseFloatOrUndefined(s: string): number | undefined {
  return undefinedIfNaN(parseFloat(s))
}
