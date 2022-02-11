export function range(start: number, end: number, step = 1): Array<number> {
  const length = (end - start) / step + 1
  const ret = Array(Math.floor(length))

  let i = 0
  for (let n = start; n < end; n += step) {
    ret[i++] = n
  }

  return ret
}
