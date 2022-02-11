import test from "ava"
import { range } from "./range"

test("range should produce a nice easy range", (t) => {
  t.deepEqual(range(0, 3), [0, 1, 2])
})

test("range should produce more difficult ranges", (t) => {
  t.deepEqual(range(3, 6), [3, 4, 5])
  t.deepEqual(range(3, 8, 2), [3, 5, 7])
  t.deepEqual(range(3, 8, 0.5), [3, 3.5, 4, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5])
})

test("range should produce negative ranges", (t) => {
  t.deepEqual(range(6, 3), [6, 5, 4])
  t.deepEqual(range(6, 1, 2), [6, 4, 2])
  t.deepEqual(range(6, 1, -2), [6, 4, 2])
  t.deepEqual(
    range(8, 3, -0.5),
    [3.5, 4, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0].reverse()
  )
  t.deepEqual(
    range(8, 3, 0.5),
    [3.5, 4, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0].reverse()
  )
})
