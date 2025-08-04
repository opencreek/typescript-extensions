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

function withDelay<T, U>(
  transform: (el: T) => Promise<U> | U,
): (el: T) => Promise<U> {
  return async (el: T) => {
    await sleep(Math.random() * 15)
    return await transform(el)
  }
}
