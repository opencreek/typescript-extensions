import test from "ava"
import { format } from "./strings"

test("format should format strings correctly", (t) => {
  const result = format("this {} is a {} test", true, 3)

  t.is(result, "this true is a 3 test")
})

test("format should deal with null and undefined", (t) => {
  const result = format(
    "this {} is a {} test: {}",
    null,
    undefined,
    "some string"
  )

  t.is(result, "this <null> is a <undefined> test: some string")
})

test("format should deal with objects", (t) => {
  const result = format("this {} is a {} test: {}", 1, 2, {
    toString: () => "bla",
  })

  t.is(result, "this 1 is a 2 test: bla")
})
