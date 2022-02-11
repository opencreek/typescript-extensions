import { error } from "."

/**
 * range will make an array from start to end (exclusive), with the given step
 *
 * @param start first value in the array
 * @param end   last value + step of the array
 * @param step  step between entries
 */
export function range(start: number, end: number, step = 1): Array<number> {
  if (step === 0) {
    error("step must not be 0")
  }

  const ret = []

  let i = 0
  step = start > end && step > 0 ? -step : step
  if (step < 0) {
    for (let n = start; n > end; n += step) {
      ret[i++] = n
    }
    return ret
  }
  for (let n = start; n < end; n += step) {
    ret[i++] = n
  }

  return ret
}
