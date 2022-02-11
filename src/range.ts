/**
 * range will make an array from start to end (exclusive), with the given step
 * @param start first value in the array
 * @param end   last value + step of the array
 * @param step  step between entries
 */
export function range(start: number, end: number, step = 1): Array<number> {
  const length = (end - start) / step + 1
  const ret = Array(Math.floor(length))

  let i = 0
  for (let n = start; n < end; n += step) {
    ret[i++] = n
  }

  return ret
}
