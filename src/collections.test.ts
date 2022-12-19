import test from "ava"
import { chain } from "./collections"

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
    undefined
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
    undefined
  )
})

test("should minOf correctly", async (t) => {
  const arr = [1, 2, 3, 2]
  const result = chain(arr).minOf((n) => n + 2)
  t.is(result, 3)

  t.is(
    chain([]).minOf((n) => n + 2),
    undefined
  )
})
