import test from "ava"
import { Chain, chain, objChain, ObjectChain } from "../collections"
import { sleep } from "../sleep"
import { asyncChain, asyncObjChain } from "./AsyncChain"
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
  // nothing runs before the first await; the selector then runs once per element
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
    { message: "3!" },
  )
})

test("async obj chain should correctly handle exceptions", async (t) => {
  const c = asyncChain([1, 2, 3, 4]).associateBy((it) => it)

  await t.throwsAsync(
    async () => {
      await c.mapKeys(withDelay((it) => (it == 3 ? error("3!") : it)))
    },
    { message: "3!" },
  )
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
    [1, 3, 6, 10],
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

  await t.throwsAsync(() => c.first(), { message: "No first element found" })
})

test("last should return last element", async (t) => {
  const c = asyncChain([10, 20, 30])

  t.is(await c.last(), 30)
})

test("last should throw for empty array", async (t) => {
  const c = asyncChain<number>([])

  await t.throwsAsync(() => c.last(), { message: "No last element found" })
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

  await t.throwsAsync(
    () =>
      c
        .flatMap(async (it) => {
          await sleep(it)
          return it === 2 ? error("2!") : [it, it]
        })
        .value(),
    { message: "2!" },
  )
})

test("error in reduce should propagate", async (t) => {
  const c = asyncChain([1, 2, 3])

  await t.throwsAsync(
    () =>
      c.reduce(async (acc: number, cur: number) => {
        await sleep(cur)
        return cur === 2 ? error("2!") : acc + cur
      }, 0),
    { message: "2!" },
  )
})

test("error in groupBy selector should propagate", async (t) => {
  const c = asyncChain([1, 2, 3])

  await t.throwsAsync(
    () => c.groupBy(withDelay((it) => (it === 2 ? error("2!") : it))).value(),
    { message: "2!" },
  )
})

test("error in sortBy selector should propagate", async (t) => {
  const c = asyncChain([1, 2, 3])

  await t.throwsAsync(
    () => c.sortBy(withDelay((it) => (it === 2 ? error("2!") : it))).value(),
    { message: "2!" },
  )
})

// ─── Memoization ─────────────────────────────────────────────────────────────

test("memoization: two derived chains should not re-evaluate common source", async (t) => {
  let evaluations = 0
  const base = asyncChain([1, 2, 3, 4, 5]).map(async (it) => {
    evaluations++
    await sleep(10 - it * 2)
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

// ─── Regressions ─────────────────────────────────────────────────────────────

test("finally should reject with the original error and run the callback", async (t) => {
  let ran = 0
  const failing = asyncChain([1, 2]).map((it) => (it === 2 ? error("2!") : it))

  await t.throwsAsync(
    failing.finally(() => ran++),
    { message: "2!" },
  )
  t.is(ran, 1)

  const ok = await asyncChain([1, 2]).finally(() => ran++)
  t.deepEqual(ok.value(), [1, 2])
  t.is(ran, 2)
})

test("finally on chain(...).mapAsync should reject", async (t) => {
  let ran = 0
  await t.throwsAsync(
    chain([1, 2])
      .mapAsync(async (it) => (it === 2 ? error("2!") : it))
      .finally(() => ran++),
    { message: "2!" },
  )
  t.is(ran, 1)
})

test("finally on AsyncObjectChain should reject with the original error", async (t) => {
  let ran = 0
  const failing = asyncObjChain({ a: 1 }).mapValues(() => error("boom"))

  await t.throwsAsync(
    failing.finally(() => ran++),
    { message: "boom" },
  )
  t.is(ran, 1)

  const ok = await asyncObjChain({ a: 1 }).finally(() => ran++)
  t.deepEqual(ok.value(), { a: 1 })
  t.is(ran, 2)
})

test("dropLast should handle 0, n and n > length", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.dropLast(0).value(), [1, 2, 3])
  t.deepEqual(await c.dropLast(1).value(), [1, 2])
  t.deepEqual(await c.dropLast(3).value(), [])
  t.deepEqual(await c.dropLast(10).value(), [])
})

test("dropLastWhile should keep everything when the last element doesn't match", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.deepEqual(await c.dropLastWhile(async (it) => it < 3).value(), [1, 2, 3])
  t.deepEqual(await c.dropLastWhile(async () => true).value(), [])
})

test("flatMap should flatten Sets, Promises of arrays and AsyncChains", async (t) => {
  const c = asyncChain([1, 2])

  t.deepEqual(
    await c.flatMap((it) => new Set([it, it, 0])).value(),
    [1, 0, 2, 0],
  )
  t.deepEqual(
    await c.flatMap(withDelay((it) => [it, it * 10])).value(),
    [1, 10, 2, 20],
  )
  t.deepEqual(
    await c.flatMap((it) => asyncChain([it, -it])).value(),
    [1, -1, 2, -2],
  )
  t.deepEqual(await c.flatMap((it) => chain([it])).value(), [1, 2])
})

const prototypeKeys = [
  "toString",
  "constructor",
  "__proto__",
  "mapValues",
  "hasOwnProperty",
]

test("groupBy should handle keys that exist on Object.prototype", async (t) => {
  const result = await asyncChain(prototypeKeys)
    .groupBy(withDelay((it) => it))
    .value()

  t.is(Object.getPrototypeOf(result), Object.prototype)
  t.deepEqual(
    Object.entries(result),
    prototypeKeys.map((it) => [it, [it]]),
  )

  const doubled = await asyncChain([...prototypeKeys, ...prototypeKeys])
    .groupBy((it) => it)
    .mapValues((it) => it.length)
    .entries()
    .value()
  t.deepEqual(
    doubled,
    prototypeKeys.map((it) => [it, 2]),
  )
})

test("reduce should respect an explicit null or undefined initial value", async (t) => {
  const seen: Array<[unknown, number, number]> = []
  const reducer = (acc: number | null | undefined, cur: number, i: number) => {
    seen.push([acc, cur, i])
    return cur
  }

  t.is(await asyncChain([1, 2]).reduce<number | null>(reducer, null), 2)
  t.deepEqual(seen, [
    [null, 1, 0],
    [1, 2, 1],
  ])

  seen.length = 0
  t.is(
    await asyncChain([1, 2]).reduce<number | undefined>(reducer, undefined),
    2,
  )
  t.deepEqual(seen, [
    [undefined, 1, 0],
    [1, 2, 1],
  ])

  t.is(await asyncChain<number>([]).reduce<number | null>(reducer, null), null)
})

test("reduce should pass index and array, starting at 1 without initial", async (t) => {
  const seen: Array<[number, number, ReadonlyArray<number>]> = []
  const result = await asyncChain([1, 2, 3]).reduce(
    async (acc, cur, i, arr) => {
      seen.push([acc, i, arr])
      return acc + cur
    },
  )

  t.is(result, 6)
  t.deepEqual(seen, [
    [1, 1, [1, 2, 3]],
    [3, 2, [1, 2, 3]],
  ])
})

test("reduceRight should pass descending indices and the array", async (t) => {
  const withoutInitial: Array<[number, number, number, ReadonlyArray<number>]> =
    []
  const r1 = await asyncChain([1, 2, 3]).reduceRight(
    async (acc, cur, i, arr) => {
      withoutInitial.push([acc, cur, i, arr])
      return acc * 10 + cur
    },
  )
  t.is(r1, 321)
  t.deepEqual(withoutInitial, [
    [3, 2, 1, [1, 2, 3]],
    [32, 1, 0, [1, 2, 3]],
  ])

  const withInitial: Array<[string, number, number]> = []
  const r2 = await asyncChain([1, 2, 3]).reduceRight((acc, cur, i) => {
    withInitial.push([acc, cur, i])
    return acc + cur
  }, "")
  t.is(r2, "321")
  t.deepEqual(withInitial, [
    ["", 3, 2],
    ["3", 2, 1],
    ["32", 1, 0],
  ])

  t.is(
    await asyncChain<number>([]).reduceRight((acc, cur) => acc + cur, "x"),
    "x",
  )
})

// sync Chain.reduce throws "Reduce of empty array with no initial value"
test("reduce/reduceRight without initial should reject on empty input like Chain", async (t) => {
  await t.throwsAsync(
    asyncChain<number>([]).reduce((a, b) => a + b),
    { instanceOf: TypeError },
  )
  await t.throwsAsync(
    asyncChain<number>([]).reduceRight((a, b) => a + b),
    { instanceOf: TypeError },
  )
})

test("findSingle should call the predicate at most once per element", async (t) => {
  let calls = 0
  const pred = (match: (it: number) => boolean) => async (it: number) => {
    calls++
    return match(it)
  }
  const c = asyncChain([1, 2, 3, 4, 5])

  t.is(await c.findSingle(pred((it) => it === 3)), 3)
  t.is(calls, 5)

  calls = 0
  t.is(await c.findSingle(pred((it) => it % 2 === 0)), undefined)
  t.is(calls, 4, "stops at the second match")

  calls = 0
  t.is(await c.findSingle(pred(() => false)), undefined)
  t.is(calls, 5)
})

test("findLast, findLastIndex and findSingle should receive (el, index, array)", async (t) => {
  const c = asyncChain(["a", "b", "c"])
  const args: Array<[string, number, ReadonlyArray<string>]> = []
  const record = (el: string, i: number, arr: ReadonlyArray<string>) => {
    args.push([el, i, arr])
    return false
  }

  await c.findLast(record)
  await c.findLastIndex(record)
  await c.findSingle(record)

  const abc = ["a", "b", "c"]
  t.deepEqual(args, [
    ["c", 2, abc],
    ["b", 1, abc],
    ["a", 0, abc],
    ["c", 2, abc],
    ["b", 1, abc],
    ["a", 0, abc],
    ["a", 0, abc],
    ["b", 1, abc],
    ["c", 2, abc],
  ])
  t.is(await c.findLastIndex(async (it) => it === "z"), undefined)
  t.is(await c.findIndex(async (it) => it === "z"), undefined)
})

test("asyncChain should accept any Iterable, promise elements and nullish", async (t) => {
  function* gen() {
    yield 1
    yield 2
  }

  t.deepEqual(await asyncChain(new Set([1, 2, 1])).value(), [1, 2])
  t.deepEqual(await asyncChain(gen()).value(), [1, 2])
  t.deepEqual(await asyncChain(chain([1, 2])).value(), [1, 2])
  t.deepEqual(
    await asyncChain([sleep(5).then(() => 1), 2, Promise.resolve(3)]).value(),
    [1, 2, 3],
  )
  t.is(asyncChain(null), undefined)
  t.is(asyncChain(undefined), undefined)
})

test("toSet should return a Set of the distinct elements", async (t) => {
  t.deepEqual(await asyncChain([1, 2, 1]).toSet(), new Set([1, 2]))
  t.deepEqual(await asyncChain<number>([]).toSet(), new Set())
})

test("union, zip, intersect, withoutAll and concat should accept Chain, array, Set and AsyncChain", async (t) => {
  const c = asyncChain([1, 2, 3])
  const others = [[2, 4], chain([2, 4]), new Set([2, 4]), asyncChain([2, 4])]

  for (const other of others) {
    t.deepEqual(await c.union(other).value(), [1, 2, 3, 4])
    t.deepEqual(await c.zip(other).value(), [
      [1, 2],
      [2, 4],
    ])
    t.deepEqual(await c.intersect(other).value(), [2])
    t.deepEqual(await c.withoutAll(other).value(), [1, 3])
    t.deepEqual(await c.concat(other).value(), [1, 2, 3, 2, 4])
  }
})

test("distinctBy should support async selectors and keep the first occurrence", async (t) => {
  const c = asyncChain(["a", "B", "A", "b", "c"])

  t.deepEqual(await c.distinctBy(withDelay((it) => it.toLowerCase())).value(), [
    "a",
    "B",
    "c",
  ])
  t.deepEqual(await asyncChain([1, 1, 2, 1]).distinct().value(), [1, 2])
})

test("runningReduce should support async reducers", async (t) => {
  const result = await asyncChain([1, 2, 3])
    .runningReduce(async (acc, it) => {
      await sleep(4 - it)
      return acc + it
    }, 10)
    .value()

  t.deepEqual(result, [11, 13, 16])
  t.deepEqual(
    await asyncChain<number>([])
      .runningReduce((a, b) => a + b, 0)
      .value(),
    [],
  )
})

// ─── Laziness ────────────────────────────────────────────────────────────────

test("nothing should run before the chain is awaited", async (t) => {
  let calls = 0
  const count = <T>(it: T) => {
    calls++
    return it
  }
  const countAsync = async <T>(it: T) => count(it)

  const c = asyncChain([3, 1, 2])
    .map(countAsync)
    .filter(async (it) => count(it) > 0)
    .sortBy(countAsync)
    .distinctBy(countAsync)
    .dropWhile(async (it) => count(it) < 0)
    .takeWhile(async (it) => count(it) > 0)
    .flatMap(async (it) => [count(it)])
    .runningReduce(async (acc, it) => acc + count(it), 0)
  const grouped = c
    .groupBy(countAsync)
    .mapValues(countAsync)
    .filterKeys(async (it) => count(it) !== -1)
  const [left] = c.partition(async (it) => count(it) > 1)
  chain([1]).mapAsync(countAsync)

  await sleep(10)
  t.is(calls, 0)

  await grouped
  t.true(calls > 0)
  const before = calls
  await sleep(5)
  t.is(calls, before, "partition branch still not evaluated")
  await left
  t.true(calls > before)
})

// ─── Memoisation ─────────────────────────────────────────────────────────────

test("awaiting the same chain repeatedly or concurrently should run callbacks once", async (t) => {
  let calls = 0
  const c = asyncChain([1, 2, 3]).map(async (it) => {
    calls++
    await sleep(1)
    return it
  })

  await Promise.all([c, c.value(), c.then((it) => it), c.toSet()])
  await c
  await c.value()
  await c.first()
  t.is(calls, 3)
})

test("partition should run the predicate once per element for both branches", async (t) => {
  let calls = 0
  const [even, odd] = asyncChain([1, 2, 3, 4]).partition(async (it) => {
    calls++
    return it % 2 === 0
  })

  t.deepEqual(await even.value(), [2, 4])
  t.deepEqual(await odd.value(), [1, 3])
  t.deepEqual(await even.value(), [2, 4])
  t.is(calls, 4)
})

test("partition should handle all-or-nothing predicates and empty input", async (t) => {
  const [all, none] = asyncChain([1, 2]).partition(async () => true)
  t.deepEqual(await all.value(), [1, 2])
  t.deepEqual(await none.value(), [])

  const [a, b] = asyncChain<number>([]).partition(() => true)
  t.deepEqual(await a.value(), [])
  t.deepEqual(await b.value(), [])
})

test("async object chain should be memoised", async (t) => {
  let calls = 0
  const o = asyncChain([1, 2, 3]).groupBy(async (it) => {
    calls++
    return it % 2
  })

  await Promise.all([o, o.value(), o.keys().value()])
  await o.values()
  t.is(calls, 3)
})

// ─── Rejections ──────────────────────────────────────────────────────────────

test("a failing callback should reject await, value, then, catch and repeat awaits", async (t) => {
  const c = asyncChain([1, 2]).map(async (it) => (it === 2 ? error("2!") : it))

  const first = await t.throwsAsync(async () => await c, { message: "2!" })
  const second = await t.throwsAsync(async () => await c, { message: "2!" })
  t.is(first, second, "same error instance on repeated await")
  await t.throwsAsync(c.value(), { message: "2!" })
  t.is(await c.then(undefined, (e: Error) => e.message), "2!")
  t.is(await c.catch((e: Error) => e.message), "2!")
  await t.throwsAsync(c.filter(() => true).value(), { message: "2!" })
})

test("a synchronously throwing callback should reject, not throw on build", async (t) => {
  const c = asyncChain([1]).map((): number => {
    throw new Error("sync")
  })

  await t.throwsAsync(c.value(), { message: "sync" })
  await t.throwsAsync(
    asyncChain([1]).every(() => error("every")),
    { message: "every" },
  )
})

test("a failing AsyncObjectChain should reject value, then and catch", async (t) => {
  const o = asyncObjChain({ a: 1 }).mapKeys(async () => error("key!"))

  await t.throwsAsync(o.value(), { message: "key!" })
  await t.throwsAsync(async () => await o, { message: "key!" })
  t.is(await o.then(undefined, (e: Error) => e.message), "key!")
  t.is(await o.catch((e: Error) => e.message), "key!")
  await t.throwsAsync(o.keys().value(), { message: "key!" })
})

test("then should resolve with the chain and pass through onfulfilled", async (t) => {
  const c = asyncChain([1, 2])

  t.is(await c.then((it) => it.value().length), 2)
  t.true((await c.catch(() => null)) instanceof Chain)
})

test.serial(
  "never-awaited failing chains should not cause unhandled rejections",
  async (t) => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on("unhandledRejection", onUnhandled)
    try {
      let calls = 0
      const failing = asyncChain([1, 2]).map(() => {
        calls++
        return error("never")
      })
      failing.filter(() => true).groupBy(() => "a")

      // one branch rejects and is caught, the sibling is never awaited
      const [left] = asyncChain([1]).partition(() => error("branch"))
      await t.throwsAsync(left.value(), { message: "branch" })

      // both sides of a union reject
      await t.throwsAsync(
        asyncChain([1])
          .map(() => error("a"))
          .union(asyncChain([2]).map(() => error("b")))
          .value(),
      )

      await sleep(20)
      t.is(calls, 0)
      t.deepEqual(unhandled, [])
    } finally {
      process.off("unhandledRejection", onUnhandled)
    }
  },
)

// ─── Order ───────────────────────────────────────────────────────────────────

// element i resolves after (n - i) * 3ms, so the last element resolves first
const reverseDelay =
  <T, U>(n: number, f: (el: T) => U) =>
  async (el: T, i: number) => {
    await sleep((n - i) * 3)
    return f(el)
  }

test("map, filter, sortBy, groupBy, associateBy and mapValues should keep input order", async (t) => {
  const finished: number[] = []
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(
    await c
      .map(
        reverseDelay(5, (it: number) => {
          finished.push(it)
          return it * 10
        }),
      )
      .value(),
    [10, 20, 30, 40, 50],
  )
  t.deepEqual(finished, [5, 4, 3, 2, 1], "callbacks resolved out of order")

  t.deepEqual(
    await c.filter(reverseDelay(5, (it: number) => it % 2 === 1)).value(),
    [1, 3, 5],
  )

  // selector receives no index: delay by value instead
  const byValue =
    <U>(f: (el: number) => U) =>
    async (el: number) => {
      await sleep((6 - el) * 3)
      return f(el)
    }
  t.deepEqual(
    await asyncChain([3, 1, 2])
      .sortBy(byValue((it) => it))
      .value(),
    [1, 2, 3],
  )
  t.deepEqual(
    await asyncChain([1, 3, 2, 4, 5])
      .groupBy(byValue((it) => (it % 2 ? "odd" : "even")))
      .value(),
    { odd: [1, 3, 5], even: [2, 4] },
  )
  t.deepEqual(
    await c
      .associateBy(byValue((it) => it))
      .mapValues(byValue((it) => it))
      .keys()
      .value(),
    ["1", "2", "3", "4", "5"],
  )
})

// ─── Concurrency (documents current behaviour) ───────────────────────────────

function tracked<T, U>(f: (el: T) => U) {
  const stats = { calls: 0, active: 0, maxActive: 0 }
  const fn = async (el: T) => {
    stats.calls++
    stats.active++
    stats.maxActive = Math.max(stats.maxActive, stats.active)
    await sleep(1)
    stats.active--
    return f(el)
  }
  return { fn, stats }
}

test("map, filter, forEach and sumOf should run callbacks concurrently", async (t) => {
  const c = asyncChain([1, 2, 3, 4])

  const map = tracked((it: number) => it)
  await c.map(map.fn)
  const filter = tracked(() => true)
  await c.filter(filter.fn)
  const forEach = tracked(() => undefined)
  await c.forEach(forEach.fn)
  const sumOf = tracked((it: number) => it)
  t.is(await c.sumOf(sumOf.fn), 10)

  for (const { stats } of [map, filter, forEach, sumOf]) {
    t.deepEqual(stats, { calls: 4, active: 0, maxActive: 4 })
  }
})

test("predicate searches should run sequentially and short-circuit", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])
  const cases: Array<
    [
      string,
      (f: (el: number) => Promise<boolean>) => Promise<unknown>,
      (it: number) => boolean,
      unknown,
      number,
    ]
  > = [
    ["some", (f) => c.some(f), (it) => it >= 2, true, 2],
    ["every", (f) => c.every(f), (it) => it < 3, false, 3],
    ["find", (f) => c.find(f), (it) => it === 2, 2, 2],
    ["findIndex", (f) => c.findIndex(f), (it) => it === 2, 1, 2],
    ["findLast", (f) => c.findLast(f), (it) => it === 4, 4, 2],
    ["findLastIndex", (f) => c.findLastIndex(f), (it) => it === 4, 3, 2],
    ["takeWhile", (f) => c.takeWhile(f).value(), (it) => it < 3, [1, 2], 3],
    ["dropWhile", (f) => c.dropWhile(f).value(), (it) => it < 3, [3, 4, 5], 3],
    [
      "takeLastWhile",
      (f) => c.takeLastWhile(f).value(),
      (it) => it > 3,
      [4, 5],
      3,
    ],
    [
      "dropLastWhile",
      (f) => c.dropLastWhile(f).value(),
      (it) => it > 3,
      [1, 2, 3],
      3,
    ],
  ]

  for (const [name, run, predicate, expected, calls] of cases) {
    const { fn, stats } = tracked(predicate)
    t.deepEqual(await run(fn), expected, name)
    t.is(stats.calls, calls, name)
    t.is(stats.maxActive, 1, name)
  }

  const firstNotNullish = tracked((it: number) => (it > 1 ? it * 10 : null))
  t.is(await c.firstNotNullishOf(firstNotNullish.fn), 20)
  t.deepEqual(firstNotNullish.stats, { calls: 2, active: 0, maxActive: 1 })

  const reducer = tracked((it: number) => it)
  t.is(await c.reduce((_acc, cur) => reducer.fn(cur)), 5)
  t.deepEqual(reducer.stats, { calls: 4, active: 0, maxActive: 1 })
})

// ─── Nested chains ───────────────────────────────────────────────────────────

test("map returning an AsyncChain should yield Chain elements", async (t) => {
  const result = await asyncChain([1, 2])
    .map((it) => asyncChain([it, it]))
    .value()

  t.true(result.every((it) => it instanceof Chain))
  t.deepEqual(
    result.map((it) => it.value()),
    [
      [1, 1],
      [2, 2],
    ],
  )
  t.deepEqual(
    await asyncChain([1, 2])
      .map((it) => asyncChain([it, it]))
      .flatten()
      .value(),
    [1, 1, 2, 2],
  )
})

// ─── Per-method assertions ───────────────────────────────────────────────────

test("every method should handle empty input", async (t) => {
  const e = asyncChain<number>([])
  const never = (): any => {
    t.fail("callback must not be called on empty input")
  }

  t.deepEqual(await e.value(), [])
  t.deepEqual(await e.writableValue(), [])
  t.deepEqual(await e.associateBy(never).value(), {})
  t.deepEqual(await asyncChain<string>([]).associateWith(never).value(), {})
  t.deepEqual(await e.chunk(2).value(), [])
  t.deepEqual(await e.concat([]).value(), [])
  t.deepEqual(await e.distinct().value(), [])
  t.deepEqual(await e.distinctBy(never).value(), [])
  t.deepEqual(await e.drop(1).value(), [])
  t.deepEqual(await e.dropLast(1).value(), [])
  t.deepEqual(await e.take(1).value(), [])
  t.deepEqual(await e.takeLast(1).value(), [])
  t.deepEqual(await e.dropWhile(never).value(), [])
  t.deepEqual(await e.dropLastWhile(never).value(), [])
  t.deepEqual(await e.takeWhile(never).value(), [])
  t.deepEqual(await e.takeLastWhile(never).value(), [])
  t.true(await e.every(never))
  t.false(await e.some(never))
  t.deepEqual(await e.filter(never).value(), [])
  t.deepEqual(
    await asyncChain<number | null>([]).filterNotNullish().value(),
    [],
  )
  t.is(await e.find(never), undefined)
  t.is(await e.findIndex(never), undefined)
  t.is(await e.findLast(never), undefined)
  t.is(await e.findLastIndex(never), undefined)
  t.is(await e.findSingle(never), undefined)
  t.is(await e.firstNotNullishOf(never), undefined)
  t.deepEqual(await asyncChain<number[]>([]).flatten().value(), [])
  t.deepEqual(await e.flatMap(() => [never()]).value(), [])
  await e.forEach(never)
  t.deepEqual(await e.groupBy(never).value(), {})
  t.is(await e.indexOf(1), undefined)
  t.is(await e.lastIndexOf(1), undefined)
  t.deepEqual(await e.intersect([1]).value(), [])
  t.is(await e.join(","), "")
  t.is(await e.mapJoin(",", never), "")
  t.deepEqual(await e.map(never).value(), [])
  t.deepEqual(await e.mapNotNullish(never).value(), [])
  t.is(await e.maxBy(never), undefined)
  t.is(await e.maxOf(never), undefined)
  t.is(await e.maxWith(never), undefined)
  t.is(await e.minBy(never), undefined)
  t.is(await e.minOf(never), undefined)
  t.is(await e.minWith(never), undefined)
  t.deepEqual(await e.permutations().value(), [])
  t.deepEqual(await e.reverse().value(), [])
  t.deepEqual(await e.slice(0, 2).value(), [])
  t.deepEqual(await e.slidingWindows(2, { step: 1, partial: true }).value(), [])
  t.deepEqual(await e.sort(never).value(), [])
  t.deepEqual(await e.sortBy(never).value(), [])
  t.deepEqual(await e.union([]).value(), [])
  t.deepEqual(await e.withoutAll([1]).value(), [])
  t.deepEqual(await e.zip([1]).value(), [])
  const [l, r] = await asyncChain<[number, string]>([]).unzip()
  t.deepEqual([l.value(), r.value()], [[], []])
})

test("chunk should split into chunks with a smaller last chunk", async (t) => {
  t.deepEqual(await asyncChain([1, 2, 3, 4, 5]).chunk(2).value(), [
    [1, 2],
    [3, 4],
    [5],
  ])
})

test("concat should append elements in order", async (t) => {
  const c = asyncChain([1, 2])

  t.deepEqual(await c.concat([3]).value(), [1, 2, 3])
  t.deepEqual(await c.concat(c).value(), [1, 2, 1, 2])
})

test("drop, take and slice should behave like Array.slice", async (t) => {
  const c = asyncChain([1, 2, 3, 4])

  t.deepEqual(await c.drop(0).value(), [1, 2, 3, 4])
  t.deepEqual(await c.drop(2).value(), [3, 4])
  t.deepEqual(await c.drop(10).value(), [])
  t.deepEqual(await c.slice(1, 3).value(), [2, 3])
  t.deepEqual(await c.slice(-2).value(), [3, 4])
  t.deepEqual(await c.slice().value(), [1, 2, 3, 4])
})

test("filter should support no-match and receive (el, index, array)", async (t) => {
  const c = asyncChain(["a", "b"])
  const args: Array<[string, number, ReadonlyArray<string>]> = []

  t.deepEqual(
    await c
      .filter(async (el, i, arr) => {
        args.push([el, i, arr])
        return false
      })
      .value(),
    [],
  )
  t.deepEqual(args, [
    ["a", 0, ["a", "b"]],
    ["b", 1, ["a", "b"]],
  ])
})

test("filterNotNullish and mapNotNullish should only drop null and undefined", async (t) => {
  t.deepEqual(
    await asyncChain([0, null, "", undefined, false, NaN])
      .filterNotNullish()
      .value(),
    [0, "", false, NaN],
  )
  t.deepEqual(
    await asyncChain([1, 2, 3, 4])
      .mapNotNullish(
        withDelay((it) => (it === 2 ? null : it === 3 ? undefined : it - 1)),
      )
      .value(),
    [0, 3],
  )
})

test("flatten should flatten arrays, Chains and Sets one level", async (t) => {
  t.deepEqual(
    await asyncChain<number[] | Chain<number> | Set<number>>([
      [1, 2],
      chain([3]),
      new Set([4]),
      [],
    ])
      .flatten()
      .value(),
    [1, 2, 3, 4],
  )
  t.deepEqual(
    await asyncChain([[[1]], [[2, 3]]])
      .flatten()
      .value(),
    [[1], [2, 3]],
  )
})

test("forEach should visit every element with index and wait for async callbacks", async (t) => {
  const seen: Array<[number, number]> = []
  await asyncChain([10, 20, 30]).forEach(async (el, i) => {
    await sleep(5 - i)
    seen.push([el, i])
  })

  t.deepEqual(
    seen.sort((a, b) => a[1] - b[1]),
    [
      [10, 0],
      [20, 1],
      [30, 2],
    ],
  )
})

test("every and some should handle true and false cases", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.true(await c.every(async (it) => it > 0))
  t.false(await c.every(async (it) => it > 1))
  t.true(await c.some(async (it) => it === 3))
  t.false(await c.some(async (it) => it > 3))
})

test("maxWith and minWith should return the first extreme element", async (t) => {
  const c = asyncChain([
    { n: 1, id: "a" },
    { n: 3, id: "b" },
    { n: 3, id: "c" },
    { n: 1, id: "d" },
  ])

  t.is((await c.maxWith((a, b) => a.n - b.n))?.n, 3)
  t.is((await c.minWith((a, b) => a.n - b.n))?.n, 1)
})

test("indexOf, lastIndexOf and includes should respect fromIndex", async (t) => {
  const c = asyncChain([1, 2, 1, 2])

  t.is(await c.indexOf(1, 1), 2)
  t.is(await c.lastIndexOf(2, 2), 1)
  t.is(await c.lastIndexOf(1, 0), 0)
  t.is(await c.lastIndexOf(9), undefined)
  t.true(await c.includes(1, 2))
  t.false(await c.includes(1, 3))
})

test("join should default to a comma separator", async (t) => {
  t.is(await asyncChain([1, 2]).join(), "1,2")
  t.is(await asyncChain(["a"]).mapJoin("-", async (it) => it + "!"), "a!")
})

test("sample should return one of the elements", async (t) => {
  t.is(await asyncChain([7]).sample(), 7)
})

test("slidingWindows should support step and partial windows", async (t) => {
  const c = asyncChain([1, 2, 3, 4, 5])

  t.deepEqual(await c.slidingWindows(2, { step: 2, partial: true }).value(), [
    [1, 2],
    [3, 4],
    [5],
  ])
  t.deepEqual(await c.slidingWindows(2, { step: 2, partial: false }).value(), [
    [1, 2],
    [3, 4],
  ])
  t.deepEqual(
    await c.slidingWindows(10, { step: 1, partial: false }).value(),
    [],
  )
})

test("permutations should produce every ordering exactly once", async (t) => {
  const result = await asyncChain([1, 2, 3]).permutations().value()

  t.deepEqual(result.map((it) => it.join("")).sort(), [
    "123",
    "132",
    "213",
    "231",
    "312",
    "321",
  ])
})

test("sort should default to string order and not mutate the source", async (t) => {
  const c = asyncChain([10, 9, 1])

  t.deepEqual(await c.sort().value(), [1, 10, 9])
  t.deepEqual(await c.sort((a, b) => a - b).value(), [1, 9, 10])
  t.deepEqual(await c.reverse().value(), [1, 9, 10])
  t.deepEqual(await c.value(), [10, 9, 1])
})

test("sortBy should support async selectors and be stable", async (t) => {
  const c = asyncChain([
    { k: 2, id: "a" },
    { k: 1, id: "b" },
    { k: 2, id: "c" },
    { k: 1, id: "d" },
  ])

  t.deepEqual(
    (await c.sortBy(withDelay((it) => it.k)).value()).map((it) => it.id),
    ["b", "d", "a", "c"],
  )
  t.deepEqual(
    await asyncChain(["b", "c", "a"])
      .sortBy(async (it) => it)
      .value(),
    ["a", "b", "c"],
  )
})

test("takeWhile, takeLastWhile and dropWhile should handle all and none matching", async (t) => {
  const c = asyncChain([1, 2, 3])
  const all = async () => true
  const none = async () => false

  t.deepEqual(await c.takeWhile(all).value(), [1, 2, 3])
  t.deepEqual(await c.takeWhile(none).value(), [])
  t.deepEqual(await c.takeLastWhile(all).value(), [1, 2, 3])
  t.deepEqual(await c.takeLastWhile(none).value(), [])
  t.deepEqual(await c.dropWhile(all).value(), [])
  t.deepEqual(await c.dropWhile(none).value(), [1, 2, 3])
  t.deepEqual(await c.dropLastWhile(none).value(), [1, 2, 3])
})

test("firstNotNullishOf should return undefined when every result is nullish", async (t) => {
  t.is(
    await asyncChain([1, 2]).firstNotNullishOf(async (it) =>
      it > 5 ? it : undefined,
    ),
    undefined,
  )
  t.is(await asyncChain([0, 1]).firstNotNullishOf(async (it) => it), 0)
})

test("maxBy, minBy, maxOf and minOf should support strings and Dates", async (t) => {
  const c = asyncChain(["b", "c", "a"])

  t.is(await c.maxBy(async (it) => it), "c")
  t.is(await c.minOf(async (it) => it), "a")
  const dates = asyncChain([2, 3, 1]).map((it) => new Date(it))
  t.deepEqual(await dates.maxOf(async (it) => it), new Date(3))
  t.deepEqual(await dates.minBy((it) => it), new Date(1))
})

test("first and last should reject on empty input with a message", async (t) => {
  const e = asyncChain<number>([]).filter(async () => false)

  await t.throwsAsync(e.first(), { message: "No first element found" })
  await t.throwsAsync(e.last(), { message: "No last element found" })
  t.is(await asyncChain([0, 1]).first(), 0)
})

// ─── AsyncObjectChain per-method assertions ──────────────────────────────────

test("asyncObjChain should accept records, ObjectChains and promises of both", async (t) => {
  const expected = { a: 1, b: 2 }

  t.deepEqual(await asyncObjChain(expected).value(), expected)
  t.deepEqual(await asyncObjChain(objChain(expected)).value(), expected)
  t.deepEqual(
    await asyncObjChain(sleep(1).then(() => expected)).value(),
    expected,
  )
  t.deepEqual(
    await asyncObjChain(Promise.resolve(objChain(expected))).value(),
    expected,
  )
  t.true((await asyncObjChain(expected)) instanceof ObjectChain)
  await t.throwsAsync(
    asyncObjChain<string, number>(
      sleep(1).then(() => error("no object")),
    ).value(),
    { message: "no object" },
  )
})

test("keys, values and entries should work on objects and empty objects", async (t) => {
  const o = asyncObjChain({ a: 1, b: 2 })
  const empty = asyncObjChain<string, number>({})

  t.deepEqual(await o.keys().value(), ["a", "b"])
  t.deepEqual(await o.values().value(), [1, 2])
  t.deepEqual(await o.entries().value(), [
    ["a", 1],
    ["b", 2],
  ])
  t.deepEqual(await empty.keys().value(), [])
  t.deepEqual(await empty.values().value(), [])
  t.deepEqual(await empty.entries().value(), [])
})

test("AsyncObjectChain transforms should support async callbacks", async (t) => {
  const o = asyncObjChain<string, number>({ a: 1, b: 2, c: 3 })

  t.deepEqual(await o.mapKeys(withDelay((k) => k.toUpperCase())).value(), {
    A: 1,
    B: 2,
    C: 3,
  })
  t.deepEqual(
    await o
      .mapEntries(async (k, v): Promise<[string, number]> => {
        await sleep(v)
        return [`${k}${v}`, v * 2]
      })
      .value(),
    { a1: 2, b2: 4, c3: 6 },
  )
  t.deepEqual(
    await o.filterEntries(async (k, v) => k !== "a" && v < 3).value(),
    { b: 2 },
  )
})

test("AsyncObjectChain filters should handle no-match and empty input", async (t) => {
  const o = asyncObjChain({ a: 1, b: 2 })
  const empty = asyncObjChain<string, number>({})
  const never = (): any => {
    t.fail("callback must not be called on empty input")
  }

  t.deepEqual(await o.filterKeys(async () => false).value(), {})
  t.deepEqual(await o.filterValues(async () => false).value(), {})
  t.deepEqual(await o.filterEntries(async () => false).value(), {})
  t.deepEqual(await empty.filterKeys(never).value(), {})
  t.deepEqual(await empty.filterValues(never).value(), {})
  t.deepEqual(await empty.filterEntries(never).value(), {})
  t.deepEqual(await empty.mapKeys(never).value(), {})
  t.deepEqual(await empty.mapValues(never).value(), {})
  t.deepEqual(await empty.mapEntries(never).value(), {})
})

// deterministic, varying delays: earlier calls of one callback finish later,
// so concurrent callbacks resolve out of input order
function withDelay<T, U>(
  transform: (el: T) => Promise<U> | U,
): (el: T) => Promise<U> {
  let calls = 0
  return async (el: T) => {
    await sleep((3 - (calls++ % 4)) * 3)
    return await transform(el)
  }
}

// ─── Second pass: thenable contract ──────────────────────────────────────────

test("then and catch without onrejected should still reject", async (t) => {
  const c = asyncChain([1]).map(async () => error("chain!"))
  const o = asyncObjChain({ a: 1 }).mapValues(async () => error("obj!"))

  await t.throwsAsync(
    c.then((it) => it),
    { message: "chain!" },
  )
  await t.throwsAsync(c.then(), { message: "chain!" })
  await t.throwsAsync(c.catch(), { message: "chain!" })
  await t.throwsAsync(
    o.then((it) => it),
    { message: "obj!" },
  )
  await t.throwsAsync(o.then(), { message: "obj!" })
  await t.throwsAsync(o.catch(), { message: "obj!" })
})

test("then with a throwing onfulfilled should reject without calling onrejected", async (t) => {
  const handled = () => "handled"

  await t.throwsAsync(
    asyncChain([1]).then(() => error("onfulfilled"), handled),
    { message: "onfulfilled" },
  )
  await t.throwsAsync(
    asyncObjChain({ a: 1 }).then(() => error("onfulfilled"), handled),
    { message: "onfulfilled" },
  )
  t.deepEqual((await asyncChain([1]).then()).value(), [1])
  t.deepEqual((await asyncObjChain({ a: 1 }).then()).value(), { a: 1 })
})

test("awaiting the same chain twice should return the same instances", async (t) => {
  const c = asyncChain([1, 2]).map((it) => it)
  const o = asyncObjChain({ a: 1 }).mapValues((it) => it)
  const source = objChain({ a: 1 })

  t.is(await c, await c)
  t.is(await c, await c.await())
  t.is(await c.value(), await c.value())
  t.is(await o, await o)
  t.is(await o.value(), await o.value())
  t.is(await asyncObjChain(source), source)
})

test("writableValue should return a fresh copy each time", async (t) => {
  const c = asyncChain([1, 2])
  const first = await c.writableValue()
  first.push(3)

  t.deepEqual(await c.value(), [1, 2])
  t.deepEqual(await c.writableValue(), [1, 2])
  t.not(await c.writableValue(), await c.writableValue())
})

test("should be tagged AsyncChain and AsyncObjectChain", (t) => {
  t.is(Object.prototype.toString.call(asyncChain([1])), "[object AsyncChain]")
  t.is(
    Object.prototype.toString.call(asyncObjChain({})),
    "[object AsyncObjectChain]",
  )
})

// ─── Second pass: inputs ─────────────────────────────────────────────────────

// documents current behaviour: like sync chain(), the array is not copied
test("asyncChain should see mutations of the input array made before the first await", async (t) => {
  const input = [1, 2]
  const c = asyncChain(input)
  input.push(3)

  t.deepEqual(await c.value(), [1, 2, 3])
  input.push(4)
  t.deepEqual(await c.value(), [1, 2, 3], "memoised after the first await")
})

test("asyncChain should resolve non-Promise thenables and reject on rejected elements", async (t) => {
  const thenable = {
    then: (resolve: (v: number) => void) => resolve(42),
  } as unknown as Promise<number>

  t.deepEqual(await asyncChain([thenable, 1]).value(), [42, 1])
  await t.throwsAsync(
    asyncChain([Promise.reject(new Error("element")), 1]).value(),
    { message: "element" },
  )
})

// ─── Second pass: callback arguments ─────────────────────────────────────────

test("every, some, find, findIndex, map, flatMap, forEach and filter callbacks should receive (el, index, array)", async (t) => {
  const c = asyncChain(["a", "b"])
  const ab = ["a", "b"]
  const expected = [
    ["a", 0, ab],
    ["b", 1, ab],
  ]
  const record = <R>(ret: R) => {
    const args: unknown[] = []
    const fn = (el: string, i: number, arr: ReadonlyArray<string>) => {
      args.push([el, i, arr])
      return ret
    }
    return { args, fn }
  }

  const every = record(true)
  await c.every(every.fn)
  const some = record(false)
  await c.some(some.fn)
  const find = record(false)
  await c.find(find.fn)
  const findIndex = record(false)
  await c.findIndex(findIndex.fn)
  const map = record(0)
  await c.map(map.fn)
  const flatMap = record([] as number[])
  await c.flatMap(flatMap.fn)
  const forEach = record(undefined)
  await c.forEach(forEach.fn)
  const filter = record(true)
  await c.filter(filter.fn)

  for (const [name, { args }] of Object.entries({
    every,
    some,
    find,
    findIndex,
    map,
    flatMap,
    forEach,
    filter,
  })) {
    t.deepEqual(args, expected, name)
  }
})

test("find and findIndex should match the last element", async (t) => {
  const c = asyncChain([1, 2, 3])

  t.is(await c.findIndex(async (it) => it === 3), 2)
  t.is(await c.find(async (it) => it === 3), 3)
})

test("firstNotNullishOf should skip undefined as well as null", async (t) => {
  t.is(
    await asyncChain([1, 2, 3]).firstNotNullishOf(async (it) =>
      it === 1 ? undefined : it === 2 ? null : it,
    ),
    3,
  )
})

test("mapJoin should run the transformer sequentially and in order", async (t) => {
  const { fn, stats } = tracked((it: number) => `${it}`)

  t.is(await asyncChain([1, 2, 3]).mapJoin("-", fn), "1-2-3")
  t.deepEqual(stats, { calls: 3, active: 0, maxActive: 1 })
})

test("maxBy and minBy should return the first element on ties like Chain", async (t) => {
  const c = [
    { n: 1, id: "a" },
    { n: 3, id: "b" },
    { n: 3, id: "c" },
    { n: 1, id: "d" },
  ]

  t.is((await asyncChain(c).maxBy(async (it) => it.n))?.id, "b")
  t.is((await asyncChain(c).minBy(async (it) => it.n))?.id, "a")
  t.is(chain(c).maxBy((it) => it.n)?.id, "b")
  t.is(chain(c).minBy((it) => it.n)?.id, "a")
})

test.serial("sample should pick the same index as Chain.sample", async (t) => {
  const random = Math.random
  try {
    for (const r of [0, 0.5, 0.99]) {
      Math.random = () => r
      t.is(await asyncChain([1, 2, 3]).sample(), chain([1, 2, 3]).sample())
    }
    Math.random = () => 0.99
    t.is(await asyncChain([1, 2, 3]).sample(), 3)
  } finally {
    Math.random = random
  }
})

test("associateWith should pass each key to the selector and keep input order", async (t) => {
  const keys: string[] = []
  const result = await asyncChain(["b", "a"])
    .associateWith(async (key) => {
      keys.push(key)
      return key + key
    })
    .entries()
    .value()

  t.deepEqual(result, [
    ["b", "bb"],
    ["a", "aa"],
  ])
  t.deepEqual(keys, ["b", "a"])
})

test("groupBy should keep symbol keys in value() but not in keys(), like Chain", async (t) => {
  const sym = Symbol("s")
  const grouped = asyncChain([1, 2]).groupBy((it) => (it === 1 ? sym : "x"))

  t.deepEqual((await grouped.value())[sym], [1])
  t.deepEqual(await grouped.keys().value(), ["x"])
  t.deepEqual(
    chain([1, 2])
      .groupBy((it) => (it === 1 ? sym : "x"))
      .keys()
      .value(),
    ["x"],
  )
})

// ─── Second pass: async matches sync ─────────────────────────────────────────

test("async results should match sync Chain over a table of inputs", async (t) => {
  const inputs = [[], [1], [3, 1, 2, 2, 4]]
  const isOdd = (it: number) => it % 2 === 1
  const ops: Record<string, (c: any) => unknown> = {
    "take(-1)": (c) => c.take(-1),
    "take(0)": (c) => c.take(0),
    "take(10)": (c) => c.take(10),
    "drop(-1)": (c) => c.drop(-1),
    "drop(2)": (c) => c.drop(2),
    "takeLast(-1)": (c) => c.takeLast(-1),
    "takeLast(2)": (c) => c.takeLast(2),
    "takeLast(10)": (c) => c.takeLast(10),
    "dropLast(-1)": (c) => c.dropLast(-1),
    "dropLast(2)": (c) => c.dropLast(2),
    "slice(-3, -1)": (c) => c.slice(-3, -1),
    "slice(1)": (c) => c.slice(1),
    "slice(-10, 10)": (c) => c.slice(-10, 10),
    "slice(2, 1)": (c) => c.slice(2, 1),
    "chunk(1)": (c) => c.chunk(1),
    "chunk(2)": (c) => c.chunk(2),
    "chunk(10)": (c) => c.chunk(10),
    permutations: (c) => c.permutations(),
    "slidingWindows(2, partial)": (c) =>
      c.slidingWindows(2, { step: 1, partial: true }),
    "slidingWindows(3, step 2)": (c) =>
      c.slidingWindows(3, { step: 2, partial: false }),
    distinct: (c) => c.distinct(),
    distinctBy: (c) => c.distinctBy(isOdd),
    reverse: (c) => c.reverse(),
    sort: (c) => c.sort(),
    "sort(desc)": (c) => c.sort((a: number, b: number) => b - a),
    sortBy: (c) => c.sortBy((it: number) => -it),
    firstOrNull: (c) => c.firstOrNull(),
    lastOrNull: (c) => c.lastOrNull(),
    "indexOf(2)": (c) => c.indexOf(2),
    "indexOf(2, -2)": (c) => c.indexOf(2, -2),
    "lastIndexOf(2)": (c) => c.lastIndexOf(2),
    "includes(2)": (c) => c.includes(2),
    join: (c) => c.join("-"),
    mapJoin: (c) => c.mapJoin("-", (it: number) => `<${it}>`),
    toSet: (c) => c.toSet(),
    writableValue: (c) => c.writableValue(),
    union: (c) => c.union([2, 5]),
    intersect: (c) => c.intersect([2, 4]),
    withoutAll: (c) => c.withoutAll([2]),
    zip: (c) => c.zip([9, 8]),
    concat: (c) => c.concat([7]),
    maxBy: (c) => c.maxBy((it: number) => it % 3),
    minBy: (c) => c.minBy((it: number) => it % 3),
    maxOf: (c) => c.maxOf((it: number) => it * 2),
    minOf: (c) => c.minOf((it: number) => it * 2),
    maxWith: (c) => c.maxWith((a: number, b: number) => a - b),
    minWith: (c) => c.minWith((a: number, b: number) => a - b),
    sumOf: (c) => c.sumOf((it: number) => it),
    every: (c) => c.every((it: number) => it > 1),
    some: (c) => c.some((it: number) => it > 3),
    find: (c) => c.find((it: number) => it > 1),
    findIndex: (c) => c.findIndex((it: number) => it > 1),
    findLast: (c) => c.findLast((it: number) => it > 1),
    findLastIndex: (c) => c.findLastIndex((it: number) => it > 1),
    findSingle: (c) => c.findSingle((it: number) => it === 4),
    firstNotNullishOf: (c) =>
      c.firstNotNullishOf((it: number) => (it > 2 ? it * 10 : null)),
    takeWhile: (c) => c.takeWhile((it: number) => it > 1),
    dropWhile: (c) => c.dropWhile((it: number) => it > 1),
    takeLastWhile: (c) => c.takeLastWhile((it: number) => it > 1),
    dropLastWhile: (c) => c.dropLastWhile((it: number) => it > 1),
    filter: (c) => c.filter((_: number, i: number) => i % 2 === 0),
    filterNotNullish: (c) => c.filterNotNullish(),
    map: (c) =>
      c.map((it: number, i: number, arr: ReadonlyArray<number>) =>
        [it, i, arr.length].join(":"),
      ),
    mapNotNullish: (c) =>
      c.mapNotNullish((it: number) => (it === 2 ? null : it)),
    flatMap: (c) => c.flatMap((it: number) => [it, -it]),
    runningReduce: (c) => c.runningReduce((a: number, b: number) => a + b, 0),
    reduce: (c) => c.reduce((a: string, b: number) => a + b, ">"),
    reduceRight: (c) => c.reduceRight((a: string, b: number) => a + b, ">"),
    groupBy: (c) => c.groupBy(isOdd),
    associateBy: (c) => c.associateBy((it: number) => it % 3),
  }
  // Chain and ObjectChain results compare by value; AsyncChain resolves to a Chain
  const unwrap = (it: unknown) =>
    it instanceof Chain || it instanceof ObjectChain ? it.value() : it

  for (const input of inputs) {
    for (const [name, op] of Object.entries(ops)) {
      t.deepEqual(
        unwrap(await op(asyncChain(input))),
        unwrap(op(chain(input))),
        `${name} on [${input}]`,
      )
    }
  }
})

// ─── Second pass: AsyncObjectChain ───────────────────────────────────────────

test("AsyncObjectChain callbacks should receive exactly key, value or both", async (t) => {
  const o = asyncObjChain<string, number>({ a: 1, b: 2 })
  const record = <R>(ret: R) => {
    const args: unknown[][] = []
    const fn = (...a: unknown[]): any => {
      args.push(a)
      return typeof ret === "function" ? ret(...a) : ret
    }
    return { args, fn }
  }

  const filterKeys = record(true)
  const filterValues = record(true)
  const filterEntries = record(true)
  const mapKeys = record((k: string) => k)
  const mapValues = record((v: number) => v)
  const mapEntries = record((k: string, v: number) => [k, v])
  await o.filterKeys(filterKeys.fn)
  await o.filterValues(filterValues.fn)
  await o.filterEntries(filterEntries.fn)
  await o.mapKeys(mapKeys.fn)
  await o.mapValues(mapValues.fn)
  await o.mapEntries(mapEntries.fn)

  const keys = [["a"], ["b"]]
  const values = [[1], [2]]
  const entries = [
    ["a", 1],
    ["b", 2],
  ]
  t.deepEqual(filterKeys.args, keys)
  t.deepEqual(filterValues.args, values)
  t.deepEqual(filterEntries.args, entries)
  t.deepEqual(mapKeys.args, keys)
  t.deepEqual(mapValues.args, values)
  t.deepEqual(mapEntries.args, entries)
  t.deepEqual(await o.filterKeys((k) => k === "a").value(), { a: 1 })
  t.deepEqual(await o.filterValues((v) => v === 2).value(), { b: 2 })
})

test("mapKeys, mapEntries and associateBy collisions should keep the last entry like ObjectChain", async (t) => {
  const rec = { a: 1, b: 2, c: 3 }
  const toA = (k: string) => (k === "c" ? "a" : k)

  t.deepEqual(await asyncObjChain<string, number>(rec).mapKeys(toA).value(), {
    a: 3,
    b: 2,
  })
  t.deepEqual(objChain(rec).mapKeys(toA).value(), { a: 3, b: 2 })
  t.deepEqual(
    await asyncObjChain<string, number>(rec).mapKeys(toA).keys().value(),
    objChain(rec).mapKeys(toA).keys().value(),
  )
  const same = (_k: string, v: number): [string, number] => ["x", v]
  t.deepEqual(
    await asyncObjChain<string, number>(rec).mapEntries(same).value(),
    { x: 3 },
  )
  t.deepEqual(objChain(rec).mapEntries(same).value(), { x: 3 })

  const byParity = (it: number) => (it % 2 ? "odd" : "even")
  t.deepEqual(await asyncChain([1, 2, 3]).associateBy(byParity).value(), {
    odd: 3,
    even: 2,
  })
  t.deepEqual(chain([1, 2, 3]).associateBy(byParity).value(), {
    odd: 3,
    even: 2,
  })
})

test("AsyncObjectChain should treat symbol and numeric keys like ObjectChain", async (t) => {
  const sym = Symbol("s")
  const rec = { b: 1, 2: 2, a: 3, 1: 4, [sym]: 5 } as Record<
    string | number | symbol,
    number
  >
  const ops: Record<string, (o: any) => unknown> = {
    value: (o) => o.value(),
    keys: (o) => o.keys(),
    values: (o) => o.values(),
    entries: (o) => o.entries(),
    mapValues: (o: any) => o.mapValues((v: number) => v * 10),
    mapKeys: (o) => o.mapKeys((k: string) => `${k}!`),
    filterKeys: (o) => o.filterKeys(() => true),
    filterValues: (o) => o.filterValues(() => true),
  }
  const unwrap = (it: unknown) =>
    it instanceof Chain || it instanceof ObjectChain ? it.value() : it

  for (const [name, op] of Object.entries(ops)) {
    t.deepEqual(
      unwrap(await op(asyncObjChain(rec))),
      unwrap(op(objChain(rec))),
      name,
    )
  }
  // current behaviour: integer keys first and as strings, symbol keys dropped
  t.deepEqual(await asyncObjChain(rec).keys().value(), ["1", "2", "b", "a"])
  t.is((await asyncObjChain(rec).value())[sym], 5)
  t.false(
    sym in
      (await asyncObjChain<string, number>(rec)
        .mapValues((v) => v)
        .value()),
  )
})

test("AsyncObjectChain should keep undefined values of partial records", async (t) => {
  const rec: Partial<Record<string, number>> = { a: undefined, b: 1 }
  const o = asyncObjChain<string, number | undefined>(rec)

  t.deepEqual(await o.keys().value(), ["a", "b"])
  t.deepEqual(await o.values().value(), [undefined, 1])
  t.deepEqual(await o.mapValues(async (v) => v ?? 0).value(), { a: 0, b: 1 })
  t.deepEqual(
    await o.filterValues(async (v) => v === undefined).value(),
    objChain<string, number | undefined>(rec)
      .filterValues((v) => v === undefined)
      .value(),
  )
  t.true("a" in (await o.filterValues(async (v) => v === undefined).value()))
})

test("AsyncObjectChain transforms should keep key order when callbacks resolve out of order", async (t) => {
  const o = asyncObjChain<string, number>({ a: 1, b: 2, c: 3, d: 4 })
  // later entries resolve first
  const slow = (v: number) => sleep((5 - v) * 3)
  const rec = { a: 1, b: 2, c: 3, d: 4 } as Record<string, number>

  t.deepEqual(
    await o
      .mapValues(async (v) => {
        await slow(v)
        return v * 10
      })
      .entries()
      .value(),
    [
      ["a", 10],
      ["b", 20],
      ["c", 30],
      ["d", 40],
    ],
  )
  t.deepEqual(
    await o
      .mapKeys(async (k) => {
        await slow(rec[k])
        return k.toUpperCase()
      })
      .keys()
      .value(),
    ["A", "B", "C", "D"],
  )
  t.deepEqual(
    await o
      .mapEntries(async (k, v): Promise<[string, number]> => {
        await slow(v)
        return [k + k, v]
      })
      .keys()
      .value(),
    ["aa", "bb", "cc", "dd"],
  )
  const all = ["a", "b", "c", "d"]
  t.deepEqual(
    await o
      .filterKeys(async (k) => {
        await slow(rec[k])
        return true
      })
      .keys()
      .value(),
    all,
  )
  t.deepEqual(
    await o
      .filterValues(async (v) => {
        await slow(v)
        return v !== 2
      })
      .keys()
      .value(),
    ["a", "c", "d"],
  )
  t.deepEqual(
    await o
      .filterEntries(async (_, v) => {
        await slow(v)
        return true
      })
      .keys()
      .value(),
    all,
  )
  t.deepEqual(
    await asyncChain(["b", "a", "c"])
      .associateBy(async (it) => {
        await sleep(it === "b" ? 9 : 1)
        return it
      })
      .keys()
      .value(),
    ["b", "a", "c"],
  )
})

test("AsyncObjectChain transforms should run callbacks concurrently", async (t) => {
  const o = asyncObjChain<string, number>({ a: 1, b: 2, c: 3 })
  const run: Record<
    string,
    (fn: (x: unknown) => Promise<unknown>) => Promise<unknown>
  > = {
    mapKeys: (fn) => o.mapKeys(async (k) => (await fn(k), k)).value(),
    // annotated: a bare `mapValues` key picks up the global Object.mapValues type
    mapValues: (fn: (x: unknown) => Promise<unknown>) =>
      o
        .mapValues(async (v) => {
          await fn(v)
          return v
        })
        .value(),
    mapEntries: (fn) =>
      o
        .mapEntries(async (k, v): Promise<[string, number]> => {
          await fn(k)
          return [k, v]
        })
        .value(),
    filterKeys: (fn) => o.filterKeys(async (k) => (await fn(k), true)).value(),
    filterValues: (fn) =>
      o.filterValues(async (v) => (await fn(v), true)).value(),
    filterEntries: (fn) =>
      o.filterEntries(async (k) => (await fn(k), true)).value(),
    associateBy: (fn) =>
      asyncChain([1, 2, 3])
        .associateBy(async (it) => (await fn(it), it))
        .value(),
    groupBy: (fn) =>
      asyncChain([1, 2, 3])
        .groupBy(async (it) => (await fn(it), it))
        .value(),
  }

  for (const [name, go] of Object.entries(run)) {
    const { fn, stats } = tracked((it: unknown) => it)
    await go(fn)
    t.deepEqual(stats, { calls: 3, active: 0, maxActive: 3 }, name)
  }
})

test("AsyncObjectChain derived chains should not run before they are awaited", async (t) => {
  let calls = 0
  const count = <T>(it: T) => {
    calls++
    return it
  }
  const o = asyncChain([1, 2]).associateBy(count)
  const derived = [
    o.mapKeys(count),
    o.mapValues(count),
    o.mapEntries((k, v): [string, number] => [count(`${k}`), v]),
    o.filterKeys((k) => count(k) !== -1),
    o.filterValues((v) => count(v) !== -1),
    o.filterEntries((k) => count(k) !== -1),
  ]
  o.keys()
  o.values()
  o.entries()
  derived[1].keys()
  asyncChain(["a"]).associateWith(count)

  await sleep(10)
  t.is(calls, 0)
  await Promise.all(derived)
  t.is(calls, 2 + 6 * 2)
})

test("AsyncObjectChain transforms should run each callback once across awaits and keys/values/entries branches", async (t) => {
  const make: Record<string, (count: () => void) => any> = {
    mapKeys: (count) =>
      asyncObjChain<string, number>({ a: 1, b: 2 }).mapKeys(
        (k) => (count(), k),
      ),
    mapValues: (count: () => void) =>
      asyncObjChain<string, number>({ a: 1, b: 2 }).mapValues((v) => {
        count()
        return v
      }),
    mapEntries: (count) =>
      asyncObjChain<string, number>({ a: 1, b: 2 }).mapEntries(
        (k, v): [string, number] => (count(), [k, v]),
      ),
    filterKeys: (count) =>
      asyncObjChain<string, number>({ a: 1, b: 2 }).filterKeys(
        () => (count(), true),
      ),
    filterValues: (count) =>
      asyncObjChain<string, number>({ a: 1, b: 2 }).filterValues(
        () => (count(), true),
      ),
    filterEntries: (count) =>
      asyncObjChain<string, number>({ a: 1, b: 2 }).filterEntries(
        () => (count(), true),
      ),
    associateBy: (count) =>
      asyncChain(["a", "b"]).associateBy((it) => (count(), it)),
  }

  for (const [name, build] of Object.entries(make)) {
    let calls = 0
    const o = build(() => calls++)
    await Promise.all([o, o.keys(), o.values().value(), o.entries()])
    await o
    await o.keys()
    await o.mapValues((it: unknown) => it)
    t.is(calls, 2, name)
  }
})

test("AsyncObjectChain rejections should propagate through keys, values, entries and chained calls", async (t) => {
  const o = () => asyncObjChain<string, number>({ a: 1, b: 2 })
  const failing: Record<string, () => any> = {
    mapKeys: () => o().mapKeys(async (k) => (k === "b" ? error("b!") : k)),
    mapValues: () => o().mapValues(async (v) => (v === 2 ? error("b!") : v)),
    mapEntries: () =>
      o().mapEntries(async (k, v): Promise<[string, number]> =>
        k === "b" ? error("b!") : [k, v],
      ),
    filterKeys: () => o().filterKeys(async (k) => k === "b" && error("b!")),
    filterValues: () => o().filterValues(async (v) => v === 2 && error("b!")),
    filterEntries: () =>
      o().filterEntries(async (k) => k === "b" && error("b!")),
    source: () =>
      asyncObjChain<string, number>(Promise.reject(new Error("b!"))),
  }

  for (const [name, build] of Object.entries(failing)) {
    const c = build()
    const e1 = await t.throwsAsync(async () => await c, { message: "b!" })
    const e2 = await t.throwsAsync(async () => await c, { message: "b!" })
    t.is(e1, e2, `${name}: same error on second await`)
    await t.throwsAsync(c.value(), { message: "b!" }, name)
    await t.throwsAsync(c.keys().value(), { message: "b!" }, name)
    await t.throwsAsync(c.values().value(), { message: "b!" }, name)
    await t.throwsAsync(
      c
        .entries()
        .map(() => 1)
        .value(),
      { message: "b!" },
    )
    await t.throwsAsync(
      c
        .mapValues((it: unknown) => it)
        .filterKeys(() => true)
        .value(),
      { message: "b!" },
      name,
    )
  }
})

test("groupBy and associateBy should round-trip through async object transforms back to AsyncChain", async (t) => {
  const fruit = asyncChain([
    "apple",
    "avocado",
    "banana",
    "blueberry",
    "cherry",
  ])

  t.deepEqual(
    await fruit
      .groupBy(async (it) => it[0])
      .mapValues(async (group) => {
        await sleep(group.length)
        return group.length
      })
      .entries()
      .filter(([, n]) => n > 1)
      .map(([k, n]) => `${k}${n}`)
      .value(),
    ["a2", "b2"],
  )
  t.deepEqual(
    await fruit
      .associateBy(async (it) => it.length)
      .mapValues(withDelay((it) => it.toUpperCase()))
      .entries()
      .sortBy(([, v]) => v)
      .map(([k]) => Number(k))
      .value(),
    [5, 7, 9, 6],
  )
})
