import { objChain, ObjectChain } from "../collections"

// shared by Chain.groupBy and AsyncChain.groupBy; not exported from the index
export function groupEntries<K extends string | symbol | number, T>(
  entries: Iterable<readonly [K, T]>,
): ObjectChain<K, ReadonlyArray<T>> {
  // a Map, so keys like "toString" or "__proto__" don't hit Object.prototype
  const groups = new Map<K, Array<T>>()
  for (const [key, el] of entries) {
    const group = groups.get(key)
    if (group) group.push(el)
    else groups.set(key, [el])
  }
  return objChain(
    Object.fromEntries(groups) as unknown as Record<K, ReadonlyArray<T>>,
  )
}
