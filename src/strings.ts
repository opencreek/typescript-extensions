export function format(
  pattern: string,
  ...args: any | undefined | null
): string {
  for (const arg of args) {
    const str =
      arg === undefined
        ? "<undefined>"
        : arg === null
        ? "<null>"
        : arg.toString()
    pattern = pattern.replace("{}", str)
  }

  return pattern
}

export function outln(pattern: string, ...args: any | undefined | null): void {
  const line = format(pattern, ...args)

  console.log(line)
}

export function errln(pattern: string, ...args: any | undefined | null): void {
  const line = format(pattern, ...args)

  console.error(line)
}

export function warnln(pattern: string, ...args: any | undefined | null): void {
  const line = format(pattern, ...args)

  console.warn(line)
}
