export * from "@opencreek/deno-std-collections"

export function filterNotNullish<T>(arr: Array<T>): Array<NonNullable<T>> {
  return arr.filter((it): it is NonNullable<T> => it != null)
}

export async function mapAsync<T, U>(
  arr: Array<T>,
  f: (e: T, index: number, array: Array<T>) => Promise<U>
): Promise<Array<U>> {
  return Promise.all(arr.map(f))
}

export async function filterAsync<T>(
  arr: Array<T>,
  f: (e: T, index: number, array: Array<T>) => Promise<boolean>
): Promise<Array<T>> {
  const includes = await mapAsync(arr, f)

  return arr.filter((_, index) => includes[index])
}
