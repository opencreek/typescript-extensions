import test from "ava"
import { BigDecimal, RoundingMode } from "./BigDecimal"

function testRounding(
  t: any,
  value: string,
  expected: string,
  opts: { precision: number; roundingMode: RoundingMode },
) {
  const test = new BigDecimal(value)
  const actual = test.round(opts.precision, opts.roundingMode)

  t.is(
    actual.toString(),
    expected,
    `round(${value}, ${opts.precision}, ${opts.roundingMode})`,
  )
}

function testUnnecessary(
  t: any,
  value: string,
  shouldThrow: boolean,
  precision: number,
) {
  const test = new BigDecimal(value)

  if (shouldThrow) {
    t.throws(() => test.round(precision, RoundingMode.ROUND_UNNECESSARY))
  } else {
    t.notThrows(() => test.round(precision, RoundingMode.ROUND_UNNECESSARY))
  }
}

test("BigDecimal rounding", (t) => {
  testRounding(t, "5.5", "6", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "2.5", "3", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "1.6", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "1.1", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "1.0", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "-1.0", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "-1.1", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "-1.6", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "-2.5", "-3", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "-5.5", "-6", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_UP,
  })

  testRounding(t, "5.5", "5", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "2.5", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "1.6", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "1.1", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "1.0", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "-1.0", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "-1.1", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "-1.6", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "-2.5", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "-5.5", "-5", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_DOWN,
  })

  testRounding(t, "5.5", "6", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "2.5", "3", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "1.6", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "1.1", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "1.0", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "-1.0", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "-1.1", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "-1.6", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "-2.5", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "-5.5", "-5", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_CEILING,
  })

  testRounding(t, "5.5", "5", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "2.5", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "1.6", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "1.1", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "1.0", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "-1.0", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "-1.1", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "-1.6", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "-2.5", "-3", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "-5.5", "-6", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })

  testRounding(t, "5.5", "6", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "2.5", "3", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "1.6", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "1.1", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "1.0", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "-1.0", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "-1.1", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "-1.6", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "-2.5", "-3", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "-5.5", "-6", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })

  testRounding(t, "5.5", "5", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "2.5", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "1.6", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "1.1", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "1.0", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "-1.0", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "-1.1", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "-1.6", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "-2.5", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "-5.5", "-5", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })

  testRounding(t, "5.5", "6", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "2.5", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "1.6", "2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "1.1", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "1.0", "1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "-1.0", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "-1.1", "-1", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "-1.6", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "-2.5", "-2", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "-5.5", "-6", {
    precision: 0,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })

  testUnnecessary(t, "5.5", true, 0)
  testUnnecessary(t, "2.5", true, 0)
  testUnnecessary(t, "1.6", true, 0)
  testUnnecessary(t, "1.1", true, 0)
  testUnnecessary(t, "1.0", false, 0)
  testUnnecessary(t, "-1.0", false, 0)
  testUnnecessary(t, "-1.1", true, 0)
  testUnnecessary(t, "-1.6", true, 0)
  testUnnecessary(t, "-2.5", true, 0)
  testUnnecessary(t, "-5.5", true, 0)

  testRounding(t, "5.5555", "5.56", {
    precision: 2,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })
  testRounding(t, "-5.5555", "-5.556", {
    precision: 3,
    roundingMode: RoundingMode.ROUND_HALF_EVEN,
  })

  testRounding(t, "5.5555", "5.56", {
    precision: 2,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })
  testRounding(t, "-5.5555", "-5.556", {
    precision: 3,
    roundingMode: RoundingMode.ROUND_HALF_UP,
  })

  testRounding(t, "5.5555", "5.55", {
    precision: 2,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })
  testRounding(t, "-5.5555", "-5.555", {
    precision: 3,
    roundingMode: RoundingMode.ROUND_HALF_DOWN,
  })

  testRounding(t, "5.5555", "5.55", {
    precision: 2,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })
  testRounding(t, "-5.5555", "-5.556", {
    precision: 3,
    roundingMode: RoundingMode.ROUND_FLOOR,
  })

  testRounding(t, "5.5555", "5.56", {
    precision: 2,
    roundingMode: RoundingMode.ROUND_CEILING,
  })
  testRounding(t, "-5.5555", "-5.555", {
    precision: 3,
    roundingMode: RoundingMode.ROUND_CEILING,
  })

  testRounding(t, "5.5555", "5.55", {
    precision: 2,
    roundingMode: RoundingMode.ROUND_DOWN,
  })
  testRounding(t, "-5.5555", "-5.555", {
    precision: 3,
    roundingMode: RoundingMode.ROUND_DOWN,
  })

  testRounding(t, "5.5555", "5.56", {
    precision: 2,
    roundingMode: RoundingMode.ROUND_UP,
  })
  testRounding(t, "-5.5555", "-5.556", {
    precision: 3,
    roundingMode: RoundingMode.ROUND_UP,
  })
})

function testDivision(
  t: any,
  dividend: string,
  divisor: string,
  expected: string,
  precision: number,
  roundingMode: RoundingMode,
) {
  const actual = new BigDecimal(dividend).div(new BigDecimal(divisor), {
    minPrecision: precision,
    roundingMode,
  })

  t.is(
    actual.toString(),
    expected,
    `${dividend} / ${divisor} (${precision}, ${roundingMode})`,
  )
}

test("BigDecimal division", (t) => {
  testDivision(t, "10", "3", "3.33333", 5, RoundingMode.ROUND_HALF_UP)
  testDivision(t, "420", "7", "60", 0, RoundingMode.ROUND_UNNECESSARY)
  testDivision(t, "-420", "7", "-60", 2, RoundingMode.ROUND_UNNECESSARY)

  t.throws(() =>
    testDivision(t, "431", "-7", "-61.57", 2, RoundingMode.ROUND_UNNECESSARY),
  )
  testDivision(t, "431", "-7", "-61.57", 2, RoundingMode.ROUND_DOWN)

  testDivision(t, "-431", "-7", "61.57", 2, RoundingMode.ROUND_DOWN)

  testDivision(
    t,
    "431231829381293819238192839183121",
    "12311231237128738127381273872183712",
    "0.0350275",
    7,
    RoundingMode.ROUND_DOWN,
  )
  testDivision(
    t,
    "431231829381293819238192839183121",
    "12311231237128738127381273872183712",
    "0.0350276",
    7,
    RoundingMode.ROUND_UP,
  )

  testDivision(t, "1", "133333333", "0.0000000075", 10, RoundingMode.ROUND_DOWN)
  testDivision(t, "1", "133333333", "0.0000000075", 10, RoundingMode.ROUND_UP)

  testDivision(t, "1", "3", "0.333333", 6, RoundingMode.ROUND_DOWN)

  t.throws(() =>
    testDivision(t, "1", "0.0000000", "throws", 12, RoundingMode.ROUND_DOWN),
  )

  testDivision(
    t,
    "0",
    "31231231231233312312312837218732187381273821731827381782",
    "0",
    20,
    RoundingMode.ROUND_DOWN,
  )
})

function testAdd(t: any, a: string, b: string, expected: string) {
  const actual = new BigDecimal(a).add(new BigDecimal(b))

  t.is(actual.toString(), expected, `${a} + ${b}`)
}

test("BigDecimal addition", (t) => {
  testAdd(t, "1", "1", "2")
  testAdd(t, "1", "0", "1")
  testAdd(t, "1", "-1", "0")
  testAdd(t, "-1", "1", "0")
  testAdd(t, "-1", "-1", "-2")

  testAdd(t, "1.1", "1.1", "2.2")
  testAdd(t, "1.1", "0", "1.1")
  testAdd(t, "1.1", "-1.1", "0")
  testAdd(t, "-1.1", "1.1", "0")

  testAdd(t, "1.1", "1.1", "2.2")
  testAdd(t, "1.1", "0", "1.1")
  testAdd(t, "1.10001", "-1.1", "0.00001")
})

function testSub(t: any, a: string, b: string, expected: string) {
  const actual = new BigDecimal(a).sub(new BigDecimal(b))

  t.is(actual.toString(), expected, `${a} - ${b}`)
}

test("BigDecimal subtraction", (t) => {
  testSub(t, "1", "1", "0")
  testSub(t, "1", "0", "1")
  testSub(t, "1", "-1", "2")
  testSub(t, "-1", "1", "-2")

  testSub(t, "1.1", "1.1", "0")
  testSub(t, "1.1", "0", "1.1")
  testSub(t, "1.1", "-1.1", "2.2")
  testSub(t, "-1.1", "1.1", "-2.2")

  testSub(t, "1.1", "1.1", "0")
  testSub(t, "1.1", "0", "1.1")
  testSub(t, "1.10001", "-1.1", "2.20001")
})

function testMul(t: any, a: string, b: string, expected: string) {
  const actual = new BigDecimal(a).mul(new BigDecimal(b))

  t.is(actual.toString(), expected, `${a} * ${b}`)
}

test("BigDecimal multiplication", (t) => {
  testMul(t, "1", "1", "1")
  testMul(t, "1", "0", "0")
  testMul(t, "1", "-1", "-1")
  testMul(t, "-1", "1", "-1")
  testMul(t, "-1", "-1", "1")

  testMul(t, "1.1", "1.1", "1.21")
  testMul(t, "1.1", "0", "0")
  testMul(t, "1.1", "-1.1", "-1.21")
  testMul(t, "-1.1", "1.1", "-1.21")

  testMul(t, "1.10001", "-1.1", "-1.210011")

  testMul(
    t,
    "12839124872189047128347128973781274812748127489174891273.189274812738127381273812",
    "2",
    "25678249744378094256694257947562549625496254978349782546.378549625476254762547624",
  )
})

test("BigDecimal.valueOf", (t) => {
  const a = new BigDecimal("-1.3")
  const b = new BigDecimal("-1.1")
  const c = new BigDecimal("-1.3000000000000001")

  t.true(a < b, `${a} < ${b}`)
  t.false(a > b, `${a} > ${b}`)
  t.true(a > c, `${a} > ${c}`)
})

test("BigDecimal.compareTo", (t) => {
  const a = new BigDecimal("-1.3")
  const b = new BigDecimal("-1.1")
  const c = new BigDecimal("-1.3000000000000001")

  const a0 = new BigDecimal("-1.300000000000")

  t.is(a.compareTo(b), -1, `${a}.compareTo(${b}) == -1`)
  t.is(a.compareTo(c), 1, `${a}.compareTo(${c}) == 1`)
  t.is(a.compareTo(a), 0, `${a}.compareTo(${a}) == 0`)

  t.is(a.equals(a0), true, `${a}.equals(${a0}) == true`)

  const arr = [a, b, c, a0, 0, -1n, a.mul(new BigDecimal("-2"))].sort(
    BigDecimal.compare,
  )
  t.snapshot(arr.map((it) => it.toString()))
})

test("BigDecimal toBigInt", (t) => {
  t.is(new BigDecimal("1.1").toBigInt(RoundingMode.ROUND_DOWN), 1n)
  t.is(new BigDecimal("1.9").toBigInt(RoundingMode.ROUND_DOWN), 1n)
  t.is(new BigDecimal("-1.1").toBigInt(RoundingMode.ROUND_DOWN), -1n)
  t.is(new BigDecimal("-1.9").toBigInt(RoundingMode.ROUND_DOWN), -1n)

  t.is(new BigDecimal("1.1").toBigInt(RoundingMode.ROUND_UP), 2n)
  t.is(new BigDecimal("1.9").toBigInt(RoundingMode.ROUND_UP), 2n)
  t.is(new BigDecimal("-1.1").toBigInt(RoundingMode.ROUND_UP), -2n)
  t.is(new BigDecimal("-1.9").toBigInt(RoundingMode.ROUND_UP), -2n)
})

test("BigDecimal format", (t) => {
  const enFormatter = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  })
  const shortEnFormatter = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
    notation: "compact",
    compactDisplay: "short",
  })
  const deFormatter = new Intl.NumberFormat("de-DE", {
    currency: "EUR",
    style: "currency",
  })
  const jpFormatter = new Intl.NumberFormat("ja-JP", {
    currency: "JPY",
    style: "currency",
  })

  t.is(new BigDecimal("1.1").format(enFormatter), "$1.10")
  t.is(
    new BigDecimal(
      "172584172487128471827481274812748172482173817264578623174671127348912478127481274.127481274821748",
    ).format(enFormatter),
    "$172,584,172,487,128,471,827,481,274,812,748,172,482,173,817,264,578,623,174,671,127,348,912,478,127,481,274.13",
  )

  t.is(new BigDecimal("1.1").format(deFormatter), "1,10 €")
  t.is(
    new BigDecimal(
      "172584172487128471827481274812748172482173817264578623174671127348912478127481274.127481274821748",
    ).format(deFormatter),
    "172.584.172.487.128.471.827.481.274.812.748.172.482.173.817.264.578.623.174.671.127.348.912.478.127.481.274,13 €",
  )

  t.is(new BigDecimal("1.1").format(jpFormatter), "￥1")
  t.is(
    new BigDecimal(
      "172584172487128471827481274812748172482173817264578623174671127348912478127481274.127481274821748",
    ).format(jpFormatter),
    "￥172,584,172,487,128,471,827,481,274,812,748,172,482,173,817,264,578,623,174,671,127,348,912,478,127,481,274",
  )

  t.is(new BigDecimal("12345.67").format(shortEnFormatter), "$12K")
})
