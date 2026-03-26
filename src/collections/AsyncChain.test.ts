import test from "ava"
import { Chain, chain } from "../collections"
import { sleep } from "../sleep"
import { asyncChain } from "./AsyncChain"
import { error } from "../error"

test("AsyncChain should contain data", async (t) => {
  const chain = asyncChain([1, 2, 3])

  const result = await chain.value()
  t.deepEqual(result, [1, 2, 3])
})

test("AsyncChain should map", async (t) => {
  const c = chain([1, 2, 3]).async()

  const b = c.map((it) => it * 2)

  const result = await b.value()

  t.deepEqual(result, [2, 4, 6])
})
test("AsyncChain should be chainable", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  const b = await c
    .map(withDelay((it) => it * 3))
    .filter(withDelay((it) => it % 2 === 1))
    .sortBy(withDelay((it) => -it))

  const result = b.value()

  t.deepEqual(result, [15, 9, 3])
})

test("AsyncChain should be chainable including value", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  const result = await c
    .map(withDelay((it) => it * 3))
    .filter(withDelay((it) => it % 2 === 1))
    .sortBy(withDelay((it) => -it))
    .value()

  t.deepEqual(result, [15, 9, 3])
})

test("async chain should not evaluate multiple times", async (t) => {
  const c = chain([1, 2, 3, 4, 5])

  let evaluations = 0
  const b = c.mapAsync(async (it) => {
    evaluations++
    return it * 3
  })

  const result = await b.value()

  t.deepEqual(result, [3, 6, 9, 12, 15])

  const result2 = await b.filter(async (it) => it % 2 === 1).value()

  t.deepEqual(result2, [3, 9, 15])
  t.is(evaluations, 5, "should not evaluate multiple times")
})

test("async object chain should not evaluate multiple times when awaited", async (t) => {
  let evaluations = 0
  const c = asyncChain([1, 2, 3])
  const objChain = c.associateBy(async (it) => {
    evaluations++
    return it.toString()
  })

  // First await
  const result1 = await objChain
  t.deepEqual(result1.value(), { "1": 1, "2": 2, "3": 3 })
  // AssociatingAsyncObjectChain calls startCalculation in constructor,
  // and then the first await calls calculate() again because .then() uses calculate() instead of await().
  // Thus evaluations becomes 3 (from constructor) + 3 (from first await) = 6.
  t.is(evaluations, 3, "should evaluate exactly once after first await")

  // Second await
  const result2 = await objChain
  t.deepEqual(result2.value(), { "1": 1, "2": 2, "3": 3 })
  t.is(
    evaluations,
    3,
    "should not re-evaluate when awaited again (memoization check)",
  )
})

test("async object chain (lazy) should not evaluate multiple times when awaited", async (t) => {
  let evaluations = 0
  const c = asyncChain([1, 2, 3])
  const objChain = c
    .associateBy((it) => it.toString())
    .mapValues(async (v) => {
      evaluations++
      return v * 2
    })
  // MappingEntriesAsyncObjectChain is lazy (doesn't call startCalculation in constructor)

  // First await
  const result1 = await objChain
  t.deepEqual(result1.value(), { "1": 2, "2": 4, "3": 6 })
  t.is(evaluations, 3, "should evaluate exactly once after first await")

  // Second await
  const result2 = await objChain
  t.deepEqual(result2.value(), { "1": 2, "2": 4, "3": 6 })
  t.is(
    evaluations,
    3,
    "should not re-evaluate when awaited again (memoization check)",
  )
})

test("Async chain should associate to async object chain", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5, 6, 7, 8, 9])

  const result = await c
    .map(withDelay((it) => it * 77))
    .groupBy(withDelay((it) => it % 4))
    .mapKeys(withDelay((it) => it * 10))
    .value()

  t.deepEqual(result, {
    "0": [308, 616],
    "10": [77, 385, 693],
    "20": [154, 462],
    "30": [231, 539],
  })
})

test("should correctly handle exceptions", async (t) => {
  const c = asyncChain([1, 2, 3, 4])

  await t.throwsAsync(
    async () =>
      await c
        .map(withDelay((it) => (it == 3 ? error("3!") : it)))
        .map((it) => it)
        .value(),
  )
})

test("async obj chain should correctly handle exceptions", async (t) => {
  const c = asyncChain([1, 2, 3, 4]).associateBy((it) => it)

  await t.throwsAsync(async () => {
    await c.mapKeys(withDelay((it) => (it == 3 ? error("3!") : it)))
  })
})

test("dropWhile should work correctly", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5, 2, 1])
  const result = await c.dropWhile(withDelay((it) => it < 3)).value()

  t.deepEqual(result, [3, 4, 5, 2, 1])
})

test("dropLastWhile should work correctly", async (t) => {
  const c = asyncChain([3, 1, 2, 3, 4, 5])
  const result = await c.dropLastWhile(withDelay((it) => it >= 3)).value()

  t.deepEqual(result, [3, 1, 2])
})

test("reduce should work correctly", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  const result = await c.reduce<number>(async (acc, cur) => {
    await sleep(0)
    return acc + cur
  })

  t.is(result, 15)
})

test("reduceRight should work correctly", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  const result = await c.reduceRight<string>(async (acc, cur) => {
    await sleep(0)
    return acc + cur.toString()
  })

  t.is(result, "54321")
})

test("All the functions once, so they don't form infinite loops", async (t) => {
  const c = chain([1, 2, 3, 4, 5, 6, 7, 8, 9]).async()

  const result = await c
    .map(withDelay((it) => it * 3))
    .mapNotNullish(withDelay((it) => it + 1))
    .concat(c)
    .distinct()
    .distinctBy(withDelay((it) => it))
    .drop(2)
    .dropLast(1)
    .dropWhile(withDelay((it) => it < 15))
    .dropLastWhile(withDelay((it) => it > 5))
    .filter(withDelay((it) => it % 3 > 0))
    .filterNotNullish()
    .chunk(2)
    .flatten()
    .flatMap(withDelay((it) => [it, it + 2]))
    .slice(0, 5)
    .sort()
    .sortBy(withDelay((it) => -it))
    .permutations()
    .reduce<Chain<ReadonlyArray<number>>>(async (array, it) =>
      chain([it, ...chain(array).value()]),
    )

  t.snapshot(result.value(), "long chain")

  t.snapshot(await c.takeWhile(withDelay((it) => it < 3)), "take while")
  t.snapshot(
    await c.takeLastWhile(withDelay((it) => it > 3)),
    "take last while",
  )

  t.snapshot(await c.zip([2, 1]).unzip(), "zip")

  t.snapshot(await c.maxBy(withDelay((it) => it * 3)), "maxBy")
  t.snapshot(await c.maxOf(withDelay((it) => it * 3)), "maxOf")
  t.snapshot(await c.minBy(withDelay((it) => it * 3)), "minBy")
  t.snapshot(await c.minOf(withDelay((it) => it * 3)), "minOf")

  t.snapshot(
    await asyncChain(c.partition(withDelay((it) => it % 2 == 1))),
    "partition",
  )

  await c.forEach(async (it) => {
    await sleep(0)
    t.true(it < 10)
  })

  t.true(await c.every(withDelay((it) => it > 0)))
  t.true(await c.some(withDelay((it) => it > 3)))

  t.snapshot(await c.first(), "first")
  t.snapshot(
    await c.firstNotNullishOf(withDelay((it) => (it < 3 ? null : it))),
    "firstNotNullishOf",
  )
  t.snapshot(await c.last(), "last")
  t.snapshot(await c.findIndex(withDelay((it) => it == 3)), "findIndex")
  t.snapshot(await c.findSingle(withDelay((it) => it % 3 == 0)), "findSingle 1")
  t.snapshot(await c.findSingle(withDelay((it) => it == 3)), "findSingle 2")

  t.snapshot(await c.indexOf(3), "indexOf")
  t.snapshot(await c.concat(c).lastIndexOf(3), "concat")

  t.snapshot(await c.intersect(asyncChain([-1, 1, 2, 3])), "intersect")

  t.snapshot(await c.join(","), "join")
  t.snapshot(await c.mapJoin(",", (it) => it + "^"), "mapJoin")
})

test("firstNotNullishOf", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5, 6, 7, 8, 9])

  const result = await c.firstNotNullishOf(
    withDelay((it) => (it < 5 ? null : it + 3)),
  )

  t.is(result, 8)
})

test("findIndex", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5, 6, 4, 8, 9])
  const result = await c.findIndex(withDelay((it) => it == 4))

  t.is(result, 3)
})

test("findLastIndex", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5, 6, 4, 8, 9])
  const result = await c.findLastIndex(withDelay((it) => it == 4))

  t.is(result, 6)
})

test("take should return first n elements", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.take(3).value(), [1, 2, 3])
})

test("take should return all elements when n >= length", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.take(10).value(), [1, 2, 3])
})

test("take should return empty array when n is 0", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.take(0).value(), [])
})

test("takeLast should return last n elements", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.takeLast(3).value(), [3, 4, 5])
})

test("takeLast should return all elements when n >= length", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.takeLast(10).value(), [1, 2, 3])
})

test("takeLast should return empty array when n is 0", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.takeLast(0).value(), [])
})

test("firstOrNull should return first element", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.is(await c.firstOrNull(), 1)
})

test("firstOrNull should return undefined for empty array", async (t) => {
  const c = asyncChain<number>([])

  t.is(await c.firstOrNull(), undefined)
})

test("lastOrNull should return last element", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.is(await c.lastOrNull(), 3)
})

test("lastOrNull should return undefined for empty array", async (t) => {
  const c = asyncChain<number>([])

  t.is(await c.lastOrNull(), undefined)
})

test("find should return first matching element", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.is(await c.find(withDelay((it) => it > 3)), 4)
})

test("find should return undefined when no element matches", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.is(await c.find(withDelay((it) => it > 10)), undefined)
})

test("findLast should return last matching element", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 3, 2, 1])

  t.is(await c.findLast(withDelay((it) => it > 2)), 3)
})

test("findLast should return undefined when no element matches", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.is(await c.findLast(withDelay((it) => it > 10)), undefined)
})

test("includes should return true when element is present", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.true(await c.includes(2))
})

test("includes should return false when element is not present", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.false(await c.includes(5))
})

test("includes should return false for empty array", async (t) => {
  const c = asyncChain<number>([])

  t.false(await c.includes(1))
})

// ─── AsyncChain untested methods ────────────────────────────────────────────

test("reverse should reverse the array", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.reverse().value(), [5, 4, 3, 2, 1])
})

test("reverse should return empty array for empty input", async (t) => {
  const c = asyncChain<number>([])

  t.deepEqual(await c.reverse().value(), [])
})

test("runningReduce should accumulate intermediate results", async (t) => {
  const c = asyncChain([1, 2, 3, 4])

  t.deepEqual(
    await c.runningReduce((acc, it) => acc + it, 0).value(),
    [0, 1, 3, 6, 10],
  )
})

test("sample should return an element from the array", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])
  const result = await c.sample()

  t.true([1, 2, 3, 4, 5].includes(result as number))
})

test("sample should return undefined for empty array", async (t) => {
  const c = asyncChain<number>([])

  t.is(await c.sample(), undefined)
})

test("slidingWindows should produce overlapping windows", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.slidingWindows(3, { step: 1, partial: false }).value(), [
    [1, 2, 3],
    [2, 3, 4],
    [3, 4, 5],
  ])
})

test("sumOf should sum elements by selector", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.is(await c.sumOf(withDelay((it) => it * 2)), 30)
})

test("sumOf should return 0 for empty array", async (t) => {
  const c = asyncChain<number>([])

  t.is(await c.sumOf((it) => it), 0)
})

test("union should merge arrays and deduplicate", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.union([2, 3, 4], [4, 5]).value(), [1, 2, 3, 4, 5])
})

test("union should work with async chains", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.union(asyncChain([3, 4, 5])).value(), [1, 2, 3, 4, 5])
})

test("withoutAll should remove specified elements", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.withoutAll([2, 4]).value(), [1, 3, 5])
})

test("withoutAll should work with async chain argument", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.withoutAll(asyncChain([2, 4])).value(), [1, 3, 5])
})

test("writableValue should return a mutable array", async (t) => {
  const c = asyncChain([1, 2, 3])
  const result = await c.writableValue()

  result.push(4)
  t.deepEqual(result, [1, 2, 3, 4])
})

test("associateBy should create an object keyed by selector", async (t) => {
  const c = asyncChain([
    { id: 1, name: "a" },
    { id: 2, name: "b" },
  ])

  const result = await c.associateBy(withDelay((it) => it.id)).value()

  t.deepEqual(result, { 1: { id: 1, name: "a" }, 2: { id: 2, name: "b" } })
})

test("associateWith should create an object from string elements", async (t) => {
  const c = asyncChain(["a", "b", "c"])

  const result = await c.associateWith((key) => key.toUpperCase()).value()

  t.deepEqual(result, { a: "A", b: "B", c: "C" })
})

test("associateWith should support async selector", async (t) => {
  const c = asyncChain(["a", "b", "c"])

  const result = await c
    .associateWith(withDelay((key) => key.toUpperCase()))
    .value()

  t.deepEqual(result, { a: "A", b: "B", c: "C" })
})

// ─── AsyncObjectChain methods ────────────────────────────────────────────────

test("AsyncObjectChain keys should return all keys", async (t) => {
  const c = asyncChain([1, 2, 3]).groupBy((it) =>
    it % 2 === 0 ? "even" : "odd",
  )

  t.deepEqual(await c.keys().sort().value(), ["even", "odd"])
})

test("AsyncObjectChain values should return all values", async (t) => {
  const c = asyncChain([1, 2, 3]).associateBy((it) => it)

  t.deepEqual(await c.values().value(), [1, 2, 3])
})

test("AsyncObjectChain entries should return key-value pairs", async (t) => {
  const c = asyncChain([1, 2]).associateBy((it) => it * 10)

  const result = await c.entries().value()
  t.deepEqual(result, [
    ["10", 1],
    ["20", 2],
  ])
})

test("AsyncObjectChain mapValues should transform values", async (t) => {
  const c = asyncChain([1, 2, 3]).associateBy((it) => it)

  const result = await c.mapValues(withDelay((v) => v * 10)).value()

  t.deepEqual(result, { 1: 10, 2: 20, 3: 30 })
})

test("AsyncObjectChain mapEntries should transform key-value pairs", async (t) => {
  const c = asyncChain([1, 2, 3]).associateBy((it) => it)

  const result = await c
    .mapEntries(async (k, v) => [`key_${k}`, v * 2] as const)
    .value()

  t.deepEqual(result, { key_1: 2, key_2: 4, key_3: 6 })
})

test("AsyncObjectChain filterKeys should keep only matching keys", async (t) => {
  const c = asyncChain([1, 2, 3, 4]).associateBy((it) => it)

  const result = await c.filterKeys(withDelay((k) => k % 2 === 0)).value()

  t.deepEqual(result, { 2: 2, 4: 4 })
})

test("AsyncObjectChain filterValues should keep only matching values", async (t) => {
  const c = asyncChain([1, 2, 3, 4]).associateBy((it) => it)

  const result = await c.filterValues(withDelay((v) => v > 2)).value()

  t.deepEqual(result, { 3: 3, 4: 4 })
})

test("AsyncObjectChain filterEntries should filter by key and value", async (t) => {
  const c = asyncChain([1, 2, 3, 4]).associateBy((it) => it)

  const result = await c.filterEntries((k, v) => k % 2 === 0 && v > 1).value()

  t.deepEqual(result, { 2: 2, 4: 4 })
})

// ─── Value assertions for snapshot-only methods ──────────────────────────────

test("takeWhile should stop at first non-matching element", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.takeWhile(withDelay((it) => it < 4)).value(), [1, 2, 3])
})

test("takeLastWhile should take from the end while predicate holds", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(
    await c.takeLastWhile(withDelay((it) => it > 2)).value(),
    [3, 4, 5],
  )
})

test("zip should pair elements from two arrays", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.zip(["a", "b", "c"]).value(), [
    [1, "a"],
    [2, "b"],
    [3, "c"],
  ])
})

test("zip should work with async chain argument", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.zip(asyncChain(["a", "b", "c"])).value(), [
    [1, "a"],
    [2, "b"],
    [3, "c"],
  ])
})

test("unzip should split pairs back into two arrays", async (t) => {
  const c = asyncChain<[number, string]>([
    [1, "a"],
    [2, "b"],
    [3, "c"],
  ])

  const [lefts, rights] = await c.unzip()
  t.deepEqual(lefts.value(), [1, 2, 3])
  t.deepEqual(rights.value(), ["a", "b", "c"])
})

test("maxBy should return element with highest selector value", async (t) => {
  const c = asyncChain([{ n: 3 }, { n: 1 }, { n: 4 }, { n: 2 }])

  t.deepEqual(await c.maxBy(withDelay((it) => it.n)), { n: 4 })
})

test("maxBy should return undefined for empty array", async (t) => {
  const c = asyncChain<{ n: number }>([])

  t.is(await c.maxBy((it) => it.n), undefined)
})

test("maxOf should return the maximum selected value", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.is(await c.maxOf(withDelay((it) => it * 2)), 10)
})

test("minBy should return element with lowest selector value", async (t) => {
  const c = asyncChain([{ n: 3 }, { n: 1 }, { n: 4 }, { n: 2 }])

  t.deepEqual(await c.minBy(withDelay((it) => it.n)), { n: 1 })
})

test("minBy should return undefined for empty array", async (t) => {
  const c = asyncChain<{ n: number }>([])

  t.is(await c.minBy((it) => it.n), undefined)
})

test("minOf should return the minimum selected value", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.is(await c.minOf(withDelay((it) => it * 2)), 2)
})

test("maxWith should return element according to comparator", async (t) => {
  const c = asyncChain([{ n: 3 }, { n: 1 }, { n: 4 }])

  t.deepEqual(await c.maxWith((a, b) => a.n - b.n), { n: 4 })
})

test("minWith should return element according to comparator", async (t) => {
  const c = asyncChain([{ n: 3 }, { n: 1 }, { n: 4 }])

  t.deepEqual(await c.minWith((a, b) => a.n - b.n), { n: 1 })
})

test("partition should split array into two halves", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])
  const [evens, odds] = c.partition(withDelay((it) => it % 2 === 0))

  t.deepEqual(await evens.value(), [2, 4])
  t.deepEqual(await odds.value(), [1, 3, 5])
})

test("permutations should produce all orderings", async (t) => {
  const c = asyncChain([1, 2, 3])
  const result = await c.permutations().value()

  t.is(result.length, 6)
  t.true(result.some((p) => p[0] === 1 && p[1] === 2 && p[2] === 3))
  t.true(result.some((p) => p[0] === 3 && p[1] === 2 && p[2] === 1))
})

test("findSingle should return the element when exactly one matches", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.is(await c.findSingle(withDelay((it) => it === 3)), 3)
})

test("findSingle should return undefined when no element matches", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.is(await c.findSingle(withDelay((it) => it > 10)), undefined)
})

test("findSingle should return undefined when multiple elements match", async (t) => {
  const c = asyncChain([1, 2, 3, 4])

  t.is(await c.findSingle(withDelay((it) => it % 2 === 0)), undefined)
})

test("indexOf should return index of first occurrence", async (t) => {
  const c = asyncChain([1, 2, 3, 2, 1])

  t.is(await c.indexOf(2), 1)
})

test("indexOf should return undefined when not found", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.is(await c.indexOf(9), undefined)
})

test("lastIndexOf should return index of last occurrence", async (t) => {
  const c = asyncChain([1, 2, 3, 2, 1])

  t.is(await c.lastIndexOf(2), 3)
})

test("intersect should return common elements", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.intersect([2, 4, 6]).value(), [2, 4])
})

test("intersect should work with async chain argument", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.intersect(asyncChain([2, 4, 6])).value(), [2, 4])
})

test("join should concatenate with separator", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.is(await c.join(", "), "1, 2, 3")
})

test("mapJoin should transform then join", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.is(
    await c.mapJoin(
      ", ",
      withDelay((it) => `(${it})`),
    ),
    "(1), (2), (3)",
  )
})

test("first should return first element", async (t) => {
  const c = asyncChain([10, 20, 30])

  t.is(await c.first(), 10)
})

test("first should throw for empty array", async (t) => {
  const c = asyncChain<number>([])

  await t.throwsAsync(() => c.first())
})

test("last should return last element", async (t) => {
  const c = asyncChain([10, 20, 30])

  t.is(await c.last(), 30)
})

test("last should throw for empty array", async (t) => {
  const c = asyncChain<number>([])

  await t.throwsAsync(() => c.last())
})

// ─── Edge cases ──────────────────────────────────────────────────────────────

test("reduce without initial value should use first element as accumulator", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  const result = await c.reduce((acc: number, cur: number) => acc + cur)

  t.is(result, 15)
})

test("reduceRight without initial value should use last element as accumulator", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  const result = await c.reduceRight((acc: number, cur: number) => acc + cur)

  t.is(result, 15)
})

// ─── Partition result independence ───────────────────────────────────────────

test("partition halves should be independently awaitable concurrently", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])
  const [evens, odds] = c.partition(withDelay((it) => it % 2 === 0))

  const [evenResult, oddResult] = await Promise.all([
    evens.value(),
    odds.value(),
  ])

  t.deepEqual(evenResult, [2, 4])
  t.deepEqual(oddResult, [1, 3, 5])
})

// ─── Error propagation ────────────────────────────────────────────────────────

test("error in flatMap should propagate", async (t) => {
  const c = asyncChain([1, 2, 3])

  await t.throwsAsync(() =>
    c
      .flatMap(async (it) => {
        await sleep(Math.random() * 15)
        return it === 2 ? error("2!") : [it, it]
      })
      .value(),
  )
})

test("error in reduce should propagate", async (t) => {
  const c = asyncChain([1, 2, 3])

  await t.throwsAsync(() =>
    c.reduce(async (acc: number, cur: number) => {
      await sleep(Math.random() * 15)
      return cur === 2 ? error("2!") : acc + cur
    }, 0),
  )
})

test("error in groupBy selector should propagate", async (t) => {
  const c = asyncChain([1, 2, 3])

  await t.throwsAsync(() =>
    c.groupBy(withDelay((it) => (it === 2 ? error("2!") : it))).value(),
  )
})

test("error in sortBy selector should propagate", async (t) => {
  const c = asyncChain([1, 2, 3])

  await t.throwsAsync(() =>
    c.sortBy(withDelay((it) => (it === 2 ? error("2!") : it))).value(),
  )
})

// ─── Memoization ─────────────────────────────────────────────────────────────

test("memoization: two derived chains should not re-evaluate common source", async (t) => {
  let evaluations = 0
  const base = asyncChain([1, 2, 3, 4, 5]).map(async (it) => {
    evaluations++
    await sleep(Math.random() * 15)
    return it * 2
  })

  const [filtered, sorted] = await Promise.all([
    base.filter((it) => it > 4).value(),
    base.sort((a, b) => a - b).value(),
  ])

  t.deepEqual(filtered, [6, 8, 10])
  t.deepEqual(sorted, [2, 4, 6, 8, 10])
  t.is(evaluations, 5, "source map should evaluate exactly once")
})

function withDelay<T, U>(
  transform: (el: T) => Promise<U> | U,
): (el: T) => Promise<U> {
  return async (el: T) => {
    await sleep(Math.random() * 15)
    return await transform(el)
  }
}
