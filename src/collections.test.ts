import test from "ava"
import { asyncChain, AsyncChain, chain } from "./collections"
import { sleep } from "./sleep"

test("should associateBy correctly", (t) => {
  const result = chain([1, 2, 3])
    .associateBy((s) => s.toString() + " str")
    .value()
  t.snapshot(result)
})

test("should associateWith correctly", (t) => {
  const result = chain(["1", "2", "3"])
    .associateWith((s) => parseInt(s) + 1)
    .value()
  t.snapshot(result)
})

test("should filterAsync correctly", async (t) => {
  const result = await chain([1, 2, 3]).filterAsync(async (n) => n !== 2)

  t.snapshot(result.value())
})

test("should findIndex correctly", (t) => {
  const arr = [1, 2, 3]
  const result = chain(arr).findIndex((n) => n === 2)
  t.is(result, 1)

  t.is(
    chain(arr).findIndex((n) => n === 5),
    undefined,
  )
})

test("should firstOrNull and first correctly", (t) => {
  const arr = [1, 2, 3, 2]
  const empty: Array<string> = []
  const result = {
    firstOrNull: chain(arr).firstOrNull(),
    first: chain(arr).first(),
    firstOrNullEmpty: chain(empty).firstOrNull(),
  }
  t.snapshot(result)

  t.throws(() => chain(empty).first())
})

test("should flatMap correctly", (t) => {
  const arr = [[1], [2, 3]]
  const result = chain(arr)
    .flatMap((s) => chain(s))
    .value()
  t.snapshot(result)
})

test("should groupBy correctly", (t) => {
  const arr = [{ a: "a" }, { a: "b" }, { a: "c" }, { a: "a" }]
  const result = chain(arr)
    .groupBy((it) => it.a)
    .value()
  t.snapshot(result)
})

test("should indexOf correctly", (t) => {
  const arr = [1, 2, 3, 2]
  const result = chain(arr).indexOf(2)
  t.is(result, 1)

  t.is(chain(arr).indexOf(5), undefined)
})

test("should lastIndexOf correctly", (t) => {
  const animals = ["Dodo", "Tiger", "Penguin", "Dodo"]
  const result = chain(animals).lastIndexOf("Dodo")
  t.is(result, 3)

  t.is(chain(animals).lastIndexOf("Lion"), undefined)
})

test("should mapJoin correctly", (t) => {
  const arr = [1, 2, 3, 2]
  const result = chain(arr).mapJoin(", ", (s) => "(" + s.toString() + ")")
  t.snapshot(result)
})

test("should lastOrNull and last correctly", (t) => {
  const arr = [1, 2, 3, 2]
  const empty: Array<string> = []
  const result = {
    lastOrNull: chain(arr).lastOrNull(),
    last: chain(arr).last(),
    lastOrNullEmpty: chain(empty).lastOrNull(),
  }
  t.snapshot(result)

  t.throws(() => chain(empty).last())
})

test("should mapAsync correctly", async (t) => {
  const result = await chain([1, 2, 3]).mapAsync(async (n) => n * 2)

  t.snapshot(result.value())
})

test("should maxOf correctly", async (t) => {
  const arr = [1, 2, 3, 2]
  const result = chain(arr).maxOf((n) => n + 2)
  t.is(result, 5)

  t.is(
    chain([]).maxOf((n) => n + 2),
    undefined,
  )
})

test("should minOf correctly", async (t) => {
  const arr = [1, 2, 3, 2]
  const result = chain(arr).minOf((n) => n + 2)
  t.is(result, 3)

  t.is(
    chain([]).minOf((n) => n + 2),
    undefined,
  )
})

test("should allow flattening on Chain<Array<T>>", (t) => {
  const arr = [[1], [2, 3]]
  const result = chain(arr).flatten().writableValue()

  t.deepEqual(result, [1, 2, 3])
})

test("should allow flattening on mixed Chains", (t) => {
  const arr = [[1], chain([2, 3]), 4, { foo: 5 }]
  const chainIn = chain(arr)
  const flattened = chainIn.flatten()
  const result = flattened.writableValue()

  t.deepEqual(result, [1, 2, 3, 4, { foo: 5 }])
})

test("should correctly create a set", (t) => {
  const arr = [1, 2, 3, 2, 1, 3]
  const set = chain(arr).toSet()

  t.is(set.size, 3)
  t.is(set.has(1), true)
  t.is(set.has(2), true)
  t.is(set.has(3), true)
})

test("should allow flatMap over sets", (t) => {
  const arr = [
    [1, 1],
    [2, 3, 2, 3, 1],
  ]

  const result = chain(arr)
    .flatMap((it) => new Set(it))
    .value()

  t.deepEqual(result, [1, 2, 3, 1])
})

test("AsyncChain should contain data", async (t) => {
  const chain = new AsyncChain([1, 2, 3])

  const result = await chain.value()
  t.deepEqual(result, [1, 2, 3])
})

test("AsyncChain should map", async (t) => {
  const chain = new AsyncChain([1, 2, 3])

  const b = chain.map((it) => it * 2)

  const result = await b.value()

  t.deepEqual(result, [2, 4, 6])
})

test("chain::mapAsync should be downwards compatible", async (t) => {
  const c = chain([1, 2, 3, 4, 5])

  const b = await c.mapAsync(async (it) => it * 3)

  const result = b.value()

  t.deepEqual(result, [3, 6, 9, 12, 15])
})

test("chain::mapAsync should be chainable into an async chain", async (t) => {
  const c = chain([1, 2, 3, 4, 5])

  const b = await c
    .mapAsync(async (it) => it * 3)
    .filter(async (it) => it % 2 === 1)
    .sortBy(async (it) => -it)

  const result = b.value()

  t.deepEqual(result, [15, 9, 3])
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

function withDelay<T, U>(transform: (el: T) => U): (el: T) => Promise<U> {
  return async (el: T) => {
    await sleep(0)
    return transform(el)
  }
}
