import { range } from "./range"
import "./collections"

function tableRow<T extends Record<string | number | symbol, unknown>>(
  row: T,
  columns: Array<keyof T>,
  columnLengths: Array<number>
): string {
  return (
    columns
      .map((key, i) => {
        const str = String(row[key])
        return "| " + str.padEnd(columnLengths[i])
      })
      .join("") + "|"
  )
}

export function tableToString<
  T extends Record<string | number | symbol, unknown>
>(table: Array<T>, columns: Array<keyof T>): string {
  const columnLengths = columns.map((key) => {
    return (
      Math.max(
        String(key).length,
        ...table.map((it) => String(it[key]).length)
      ) + 1
    )
  })

  const border =
    " " +
    range(0, columnLengths.sumOf((it) => it + 1) + 1)
      .map((_) => "-")
      .join("")

  const header =
    "|" +
    columns
      .map((it, i) => {
        const str = it.toString()

        return " " + str.padEnd(columnLengths[i])
      })
      .join("|") +
    "|"

  return [
    border,
    header,
    border,
    ...table.map((row) => tableRow(row, columns, columnLengths)),
    border,
  ].join("\n")
}
