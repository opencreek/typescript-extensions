import test from "ava"
import { chain } from "../collections"
import { sleep } from "../sleep"
import { asyncChain } from "./AsyncChain"

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

function withDelay<T, U>(transform: (el: T) => U): (el: T) => Promise<U> {
  return async (el: T) => {
    await sleep(0)
    return transform(el)
  }
}
