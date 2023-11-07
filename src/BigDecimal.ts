import { error } from "./error"

export enum RoundingMode {
  /**
   * Rounding mode to round away from zero.
   * e.g. 1.5 -> 2, -2.5 -> -3
   */
  ROUND_UP = "ROUND_UP",
  /**
   * Rounding mode to round towards zero.
   * e.g. 1.5 -> 1, -2.5 -> -2
   */
  ROUND_DOWN = "ROUND_DOWN",
  /**
   * Rounding mode to round towards positive infinity.
   * e.g. 1.5 -> 2, -2.5 -> -2
   */
  ROUND_CEILING = "ROUND_CEILING",
  /**
   * Rounding mode to round towards negative infinity.
   * e.g. 1.5 -> 1, -2.5 -> -3
   */
  ROUND_FLOOR = "ROUND_FLOOR",
  /**
   * Rounding mode to round towards "nearest neighbor" unless both neighbors are equidistant, in which case round up.
   * e.g. 1.5 -> 2, 2.5 -> 3, -1.5 -> -2, -2.5 -> -3
   */
  ROUND_HALF_UP = "ROUND_HALF_UP",
  /**
   * Rounding mode to round towards the "nearest neighbor" unless both neighbors are equidistant, in which case round down.
   * e.g. 1.5 -> 1, 2.5 -> 2, -1.5 -> -1, -2.5 -> -2
   */
  ROUND_HALF_DOWN = "ROUND_HALF_DOWN",
  /**
   * Rounding mode to round towards the "nearest neighbor" unless both neighbors are equidistant, in which case, round towards the even neighbor.
   * e.g. 1.5 -> 2, 2.5 -> 2, 3.5 -> 4, -1.5 -> -2, -2.5 -> -2, -3.5 -> -4
   */
  ROUND_HALF_EVEN = "ROUND_HALF_EVEN",
  /**
   * Rounding mode to assert that the requested operation has an exact result, hence no rounding is necessary.
   * If this rounding mode is specified on an operation that yields an inexact result, an exception is thrown.
   * e.g. 1.5 -> error, 2 -> 2, -2.5 -> error
   */
  ROUND_UNNECESSARY = "ROUND_UNNECESSARY",
}

export function compareBigDecimals(
  a: BigDecimal | number | bigint,
  b: BigDecimal | number | bigint,
): -1 | 0 | 1 {
  if (typeof a === "number" || typeof a === "bigint") {
    a = new BigDecimal(a)
  }
  if (typeof b === "number" || typeof b === "bigint") {
    b = new BigDecimal(b)
  }

  return a.compareTo(b)
}

export class BigDecimal {
  /**
   * This scale is used to widen values to when valueOf is called.
   * This is necessary because valueOf returns a bigint and to make sensible comparisons, all valueOf bigints have to have the same scale.
   */
  static DEFAULT_VALUE_OF_SCALE = 18

  static compare = compareBigDecimals

  /**
   * The unscaled value of the BigDecimal, e.g. 12345 for 12.345 with a scale of 3.
   */
  #value: bigint
  /**
   * How many digits are after the decimal point, e.g. 3 for 12.345 with an unscaled value of 12345.
   */
  #scale: number

  constructor(value: bigint | number | string | BigDecimal, scale?: number) {
    if (value instanceof BigDecimal) {
      this.#value = value.#value
      this.#scale = value.#scale

      // value and scale from the other BigDecimal were already checked to be good, so we can just return here
      return
    }

    const str = value.toString()
    // check for scientific notation, which we just ignore
    if (str.includes("e")) {
      error("BigDecimal: exponential notation is not supported")
    }

    // split into integer and decimal parts
    const [integer, decimal] = str.split(".")

    // The unscaled value is the integer part followed by the decimal part
    this.#value = BigInt(`${integer}${decimal ?? ""}`)
    // The initial scale is either given (needed for certain math operations) or the length of the decimal part
    this.#scale = scale ?? decimal?.length ?? 0

    // we can't handle scales larger than that
    if (this.#scale > Number.MAX_SAFE_INTEGER) {
      error("BigDecimal: decimal part is too long")
    }

    // negative scales don't make sense so we throw here
    if (this.#scale < 0) {
      error("BigDecimal: scale must be non-negative")
    }

    // a value of 0 always has a scale of 0
    if (this.#value === 0n) {
      this.#scale = 0
    } else {
      // we remove trailing zeros to make the scale (and the value) as small as possible
      const str = this.#value.toString()
      const oldScale = this.#scale
      // we check from the end of the string and count the zeros
      for (let i = str.length - 1; i >= 0 && this.#scale > 0; i--) {
        if (str[i] !== "0") {
          break
        }
        this.#scale--
      }

      // if we removed zeros, we need to adjust the value
      if (oldScale !== this.#scale) {
        this.#value /= 10n ** BigInt(oldScale - this.#scale)
      }
    }
  }

  /**
   * Returns the unscaled value of this BigDecimal if the scale was the given value.
   * If the scale is smaller than the current scale, this function will throw.
   *
   * @param scale The scale to use for the new unscaled value.
   */
  #widen(scale: number): bigint {
    if (scale < this.#scale) {
      error("BigDecimal: widen needs to get a larger scale")
    }
    if (scale === this.#scale) {
      return this.#value
    }

    return this.#value * 10n ** BigInt(scale - this.#scale)
  }

  /**
   * Add this BigDecimal to another BigDecimal.
   *
   * @param value The BigDecimal to add to this BigDecimal.
   * @returns The sum of this BigDecimal and the given BigDecimal.
   */
  add(value: BigDecimal): BigDecimal {
    // The new scale is the larger of the two scales
    const scale = Math.max(this.#scale, value.#scale)

    // we widen both values to the new scale
    const a = this.#widen(scale)
    const b = value.#widen(scale)

    // we simply add the unscaled values and the BigDecimal constructor will remove trailing zeros for us
    return new BigDecimal(a + b, scale)
  }

  /**
   * Subtract another BigDecimal from this BigDecimal.
   *
   * @param value The BigDecimal to subtract from this BigDecimal.
   * @returns The difference of this BigDecimal and the given BigDecimal.
   */
  sub(value: BigDecimal): BigDecimal {
    // The new scale is the larger of the two scales
    const scale = Math.max(this.#scale, value.#scale)

    // we widen both values to the new scale
    const a = this.#widen(scale)
    const b = value.#widen(scale)

    // we simply subtract the unscaled values and the BigDecimal constructor will remove trailing zeros for us
    return new BigDecimal(a - b, scale)
  }

  /**
   * Multiply this BigDecimal with another BigDecimal.
   *
   * @param value The BigDecimal to multiply this BigDecimal with.
   * @returns The product of this BigDecimal and the given BigDecimal.
   */
  mul(value: BigDecimal): BigDecimal {
    // The new scale is the sum of the two scales (e.g. 0.1 * 0.1 = 0.01)
    const scale = this.#scale + value.#scale

    // we multiply the unscaled values and the BigDecimal constructor will remove trailing zeros for us
    // compare 0.2 * 0.1 = 0.02 is the same as 2 * 1 = 2 with new scale 2
    const a = this.#value
    const b = value.#value

    return new BigDecimal(a * b, scale)
  }

  /**
   * Divide this BigDecimal by another BigDecimal.
   * It is necessary to provide a minimum precision and a rounding mode because there are cases where no exact result can be given (e.g. 1/3).
   *
   * This function will not lose precision if the dividend or the divisor are more precise than the minium precision.
   *
   * @param value The BigDecimal to divide this BigDecimal by.
   * @param minPrecision The minium precision, meaning the number of digits after the decimal place, to round to.
   * @param roundingMode The rounding mode to use if the result is not exact.
   *
   * @returns The quotient of this BigDecimal and the given BigDecimal with the given minimum precision and rounded according to the rounding mode
   */
  div(
    value: BigDecimal,
    {
      minPrecision,
      roundingMode,
    }: { minPrecision: number; roundingMode: RoundingMode },
  ): BigDecimal {
    // The new scale is the largest of the two scales or the minimum precision
    // We add 1 to the scale to make sure we have enough precision for rounding
    const scale = Math.max(this.#scale, value.#scale, minPrecision) + 1

    // the dividend is widened by two times the scale, so that in the end we achieve the needed scale for the precision
    // this is because the scales get subtracted when dividing
    const dividend = this.#widen(scale * 2)
    const divisor = value.#widen(scale)

    // we simply divide the new unscaled versions
    const quotient = dividend / divisor

    // we round the quotient in the tenth place and then create a new BigDecimal with the new scale
    return new BigDecimal(roundTenth(quotient, roundingMode), scale)
  }

  /**
   * Rounds this BigDecimal to the given precision with the given rounding mode.
   *
   * @param precision The precision, meaning the number of digits after the decimal place, to round to.
   * @param roundingMode The rounding mode to use.
   *
   * @returns The rounded BigDecimal.
   */
  round(precision: number, roundingMode: RoundingMode): BigDecimal {
    // we need to add 1 to the precision because we need to round in the tenth place
    const scale = precision + 1

    // we widen or shorten the value to the new scale
    const diff = scale - this.#scale
    const value =
      diff >= 0
        ? this.#value * 10n ** BigInt(diff)
        : this.#value / 10n ** BigInt(-diff)

    // we round the value in the tenth place and then create a new BigDecimal with the new scale
    return new BigDecimal(roundTenth(value, roundingMode), scale)
  }

  /**
   * Returns the unscaled value of this BigDecimal.
   */
  unscaledValue(): bigint {
    return this.#value
  }

  /**
   * Returns the scale of this BigDecimal.
   */
  scale(): number {
    return this.#scale
  }

  compareTo(value: BigDecimal): -1 | 0 | 1 {
    const scale = Math.max(this.#scale, value.#scale)

    const a = this.#widen(scale)
    const b = value.#widen(scale)

    if (a < b) {
      return -1
    } else if (a > b) {
      return 1
    } else {
      return 0
    }
  }

  equals(value: BigDecimal): boolean {
    return this.compareTo(value) === 0
  }

  /**
   * Returns a scaled value of this BigDecimal. The scale is always BigDecimal.DEFAULT_VALUE_OF_SCALE to make sure that comparisons work without issue.
   */
  valueOf(): bigint {
    if (this.#scale > BigDecimal.DEFAULT_VALUE_OF_SCALE) {
      error(
        "BigDecimal: scale is too large for valueOf. Might happen because of a comparison?",
      )
    }

    return this.#widen(BigDecimal.DEFAULT_VALUE_OF_SCALE)
  }

  toJSON(): string {
    return this.toString()
  }

  /**
   * Returns a string representation of this BigDecimal.
   */
  toString(): string {
    const value = this.#value.toString().padStart(this.#scale + 1, "0")
    const scale = this.#scale
    if (scale === 0) {
      return value
    }

    return `${value.slice(0, -scale)}.${value.slice(-scale)}`
  }
}

/**
 * Rounds the given value to the tenth place with the given rounding mode.
 */
function roundTenth(value: bigint, roundingMode: RoundingMode): bigint {
  const remainder = value % 10n
  if (remainder === 0n) {
    return value
  }

  const sign = value < 0n ? -1n : 1n

  switch (roundingMode) {
    case RoundingMode.ROUND_UP:
      return value + sign * 10n - remainder
    case RoundingMode.ROUND_DOWN:
      return value - remainder
    case RoundingMode.ROUND_CEILING:
      return sign === 1n
        ? roundTenth(value, RoundingMode.ROUND_UP)
        : roundTenth(value, RoundingMode.ROUND_DOWN)
    case RoundingMode.ROUND_FLOOR:
      return sign === 1n
        ? roundTenth(value, RoundingMode.ROUND_DOWN)
        : roundTenth(value, RoundingMode.ROUND_UP)
    case RoundingMode.ROUND_HALF_UP:
      return sign * remainder < 5n
        ? value - remainder
        : value + sign * 10n - remainder
    case RoundingMode.ROUND_HALF_DOWN:
      return sign * remainder <= 5n
        ? value - remainder
        : value + sign * 10n - remainder
    case RoundingMode.ROUND_HALF_EVEN: {
      const tenthDigit = (value / 10n) % 10n
      if (tenthDigit % 2n === 0n) {
        return roundTenth(value, RoundingMode.ROUND_HALF_DOWN)
      } else {
        return roundTenth(value, RoundingMode.ROUND_HALF_UP)
      }
    }
    case RoundingMode.ROUND_UNNECESSARY:
      error("BigDecimal: rounding is unnecessary")
  }
}
