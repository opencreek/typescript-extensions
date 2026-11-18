import test from "ava"
import "./objects"

test("Object.prototype.mapValues should work at runtime", (t) => {
  const result: Record<"a" | "b", number> = { a: 1, b: 2 }.mapValues(
    (v) => v * 2,
  )

  t.deepEqual(result, { a: 2, b: 4 })
})
