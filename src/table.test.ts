import test from "ava"
import { tableToString } from "./table"

test("table should format correctly", (t) => {
  const table = [
    {
      test: "some really long content",
      key: "short content",
    },
    {
      test: "a",
      key: "bbb",
    },
    {
      test: "aiaiaiaiai",
      key: "bla",
    },
  ]

  t.is(
    tableToString(table, ["key", "test"]),
    ` ------------------------------------------
| key           | test                     |
 ------------------------------------------
| short content | some really long content |
| bbb           | a                        |
| bla           | aiaiaiaiai               |
 ------------------------------------------`
  )
})
