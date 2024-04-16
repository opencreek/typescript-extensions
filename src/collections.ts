import {
  chunk,
  distinct,
  distinctBy,
  dropLastWhile,
  dropWhile,
  findLast,
  findLastIndex,
  findSingle,
  firstNotNullishOf,
  intersect,
  mapNotNullish,
  maxBy,
  maxWith,
  minBy,
  minWith,
  partition,
  permutations,
  runningReduce,
  sample,
  slidingWindows,
  sortBy,
  sumOf,
  takeLastWhile,
  takeWhile,
  union,
  unzip,
  withoutAll,
  zip,
} from "@opencreek/deno-std-collections"
import { error } from "."

type PairSplit<T> = T extends [infer F, infer L] ? [Chain<F>, Chain<L>] : never

type IfString<T, U> = T extends string ? U : never

type ArrayOrChain<U> = Chain<U> | ReadonlyArray<U>
// used to mappe type union below
// otherwise mixed types in chains, would not be carried over correctly
type Distribute<U> = U extends any ? { type: U } : never
type FlattenChain<T> = Distribute<T> extends { type: ArrayOrChain<infer U> }
  ? Chain<U>
  : Chain<T>

export function objChain<K extends string | number | symbol, T>(
  value: Record<K, T> | ObjectChain<K, T> | Chain<readonly [K, T]>,
): ObjectChain<K, T>
export function objChain<K extends string | number | symbol, T>(
  value: Partial<Record<K, T>>,
): ObjectChain<K, T, Partial<Record<K, T>>>
export function objChain<_K extends string | number | symbol, _T>(
  value: undefined | null,
): undefined
export function objChain<K extends string | number | symbol, T>(
  value:
    | Record<K, T>
    | ObjectChain<K, T>
    | Chain<readonly [K, T]>
    | undefined
    | null,
): ObjectChain<K, T> | undefined
export function objChain<K extends string | number | symbol, T>(
  value:
    | Record<K, T>
    | Partial<Record<K, T>>
    | ObjectChain<K, T>
    | Chain<readonly [K, T]>
    | undefined
    | null,
): ObjectChain<K, T, Partial<Record<K, T>>> | undefined {
  if (value == null) return undefined
  if (value instanceof ObjectChain) {
    return value
  }

  if (value instanceof Chain) {
    return new ObjectChain(
      Object.fromEntries(value.value()) as Record<K, T>,
    ) as ObjectChain<K, T>
  }

  return new ObjectChain(value)
}

export function chain<T>(
  value: ReadonlyArray<T> | Chain<T> | Iterable<T>,
): Chain<T>
export function chain<_T>(value: undefined | null): undefined
export function chain<T>(
  value: ReadonlyArray<T> | Chain<T> | Iterable<T> | undefined | null,
): Chain<T> | undefined
export function chain<T>(
  value: ReadonlyArray<T> | Chain<T> | Iterable<T> | undefined | null,
): Chain<T> | undefined {
  if (value == null) return undefined
  if (value instanceof Chain) return value
  if (Array.isArray(value)) return new Chain(value)

  return new Chain([...value])
}

export class ObjectChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> {
  constructor(private val: Rec) {}

  value(): Rec {
    return this.val
  }

  keys(): Chain<K> {
    return new Chain(Object.keys(this.val)) as Chain<K>
  }

  values(): Chain<T> {
    return new Chain(Object.values(this.val))
  }

  entries(): Chain<[K, T]> {
    return new Chain(Object.entries(this.val) as Array<[K, T]>)
  }

  mapKeys<U extends string | number | symbol>(
    transformer: (key: K) => U,
  ): ObjectChain<U, T> {
    const entries = Object.entries(this.val) as [K, T][]
    const mapped = entries.map(([k, v]) => {
      return [transformer(k), v]
    })

    return new ObjectChain(Object.fromEntries(mapped))
  }

  mapValues<V>(transformer: (value: T) => V): ObjectChain<K, V> {
    const entries = Object.entries(this.val) as [K, T][]
    const mapped = entries.map(([k, v]) => {
      return [k, transformer(v)]
    })

    return new ObjectChain(Object.fromEntries(mapped))
  }

  mapEntries<U extends string | number | symbol, V>(
    transformer: (key: K, value: T) => [U, V],
  ): ObjectChain<U, V> {
    const entries = Object.entries(this.val) as [K, T][]
    const mapped = entries.map(([k, v]) => {
      return transformer(k, v)
    })

    return new ObjectChain(
      Object.fromEntries(mapped) as Record<U, V>,
    ) as ObjectChain<U, V>
  }

  filterKeys(filter: (key: K) => boolean): ObjectChain<K, T> {
    const entries = Object.entries(this.val) as [K, T][]
    const filtered = entries.filter(([k, _]) => {
      return filter(k)
    })

    return new ObjectChain(
      Object.fromEntries(filtered) as Record<K, T>,
    ) as ObjectChain<K, T>
  }

  filterValues(filter: (value: T) => boolean): ObjectChain<K, T> {
    const entries = Object.entries(this.val) as [K, T][]
    const filtered = entries.filter(([_, v]) => {
      return filter(v)
    })

    return new ObjectChain(
      Object.fromEntries(filtered) as Record<K, T>,
    ) as ObjectChain<K, T>
  }

  filterEntries(filter: (key: K, value: T) => boolean): ObjectChain<K, T> {
    const entries = Object.entries(this.val) as [K, T][]
    const filtered = entries.filter(([k, v]) => {
      return filter(k, v)
    })

    return new ObjectChain(
      Object.fromEntries(filtered) as Record<K, T>,
    ) as ObjectChain<K, T>
  }
}

export class Chain<T> implements Iterable<T> {
  constructor(private val: ReadonlyArray<T>) {}

  [Symbol.iterator](): IterableIterator<T> {
    return this.val[Symbol.iterator]()
  }

  toSet(): Set<T> {
    return new Set(this.val)
  }

  writableValue(): Array<T> {
    return [...this.val]
  }

  value(): ReadonlyArray<T> {
    return this.val
  }

  associateBy<S extends string | number | symbol>(
    selector: (el: T) => S,
  ): ObjectChain<S, T> {
    const entries = this.map((m) => {
      return [selector(m), m] as const
    })
    return objChain(entries)
  }

  associateWith<U>(
    selector: (key: string) => U,
  ): IfString<T, ObjectChain<string, U>> {
    const entries = this.map((el) => {
      return [
        el as unknown as string,
        selector(el as unknown as string),
      ] as const
    })
    return objChain(entries) as IfString<T, ObjectChain<string, U>>
  }

  chunk(size: number): Chain<T[]> {
    const chunks = chunk(this.val, size)
    return new Chain(chunks)
  }

  concat(other: Iterable<T>): Chain<T> {
    return new Chain([...this.val, ...other])
  }

  distinct(): Chain<T> {
    const unique = distinct(this.val)
    return new Chain(unique)
  }

  distinctBy<D>(selector: (el: T) => D): Chain<T> {
    const unique = distinctBy(this.val, selector)
    return new Chain(unique)
  }

  drop(num: number): Chain<T> {
    return new Chain(this.val.slice(num))
  }

  dropLast(num: number): Chain<T> {
    return new Chain(this.val.slice(0, -num))
  }

  take(num: number): Chain<T> {
    return new Chain(this.val.slice(0, num))
  }

  takeLast(num: number): Chain<T> {
    return new Chain(this.val.slice(-num))
  }

  dropLastWhile(predicate: (el: T) => boolean): Chain<T> {
    const dropped = dropLastWhile(this.val, predicate)
    return new Chain(dropped)
  }

  dropWhile(predicate: (el: T) => boolean): Chain<T> {
    const dropped = dropWhile(this.val, predicate)
    return new Chain(dropped)
  }

  every<S extends T>(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => el is S,
  ): this is Chain<S>
  every(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): boolean
  every(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): boolean {
    return this.val.every(predicate)
  }

  some(
    predicate: (value: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): boolean {
    return this.val.some(predicate)
  }

  first(): T {
    return this.firstOrNull() ?? error("No first element found")
  }

  firstOrNull(): T | undefined {
    return this.val[0]
  }

  filter<S extends T>(
    filter: (el: T, index: number, array: ReadonlyArray<T>) => el is S,
  ): Chain<S>
  filter(
    filter: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): Chain<T>
  filter(
    filter: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): Chain<T> {
    const filtered = this.val.filter(filter)
    return new Chain(filtered)
  }

  async filterAsync(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean>,
  ): Promise<Chain<T>> {
    const includes = await this.mapAsync(predicate)
    return this.filter((_, index) => includes.val[index])
  }

  filterNotNullish(): Chain<NonNullable<T>> {
    return this.filter((it) => it != null) as Chain<NonNullable<T>>
  }

  find<S extends T>(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => el is S,
  ): S | undefined
  find(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): T | undefined
  find(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): T | undefined {
    return this.val.find(predicate)
  }

  findIndex(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): number | undefined {
    const ret = this.val.findIndex(predicate)
    if (ret === -1) return undefined
    return ret
  }

  findLast(predicate: (el: T) => boolean): T | undefined {
    return findLast(this.val, predicate)
  }

  findLastIndex(predicate: (el: T) => boolean): number | undefined {
    return findLastIndex(this.val, predicate)
  }

  findSingle(predicate: (el: T) => boolean): T | undefined {
    return findSingle(this.val, predicate)
  }

  firstNotNullishOf<O>(
    selector: (item: T) => O | undefined | null,
  ): NonNullable<O> | undefined {
    return firstNotNullishOf(this.val, selector)
  }

  flatten(): FlattenChain<T> {
    const flattened = this.val.flatMap((it) =>
      it instanceof Chain ? it.val : Array.isArray(it) ? it : [it],
    )
    return new Chain(flattened) as FlattenChain<T>
  }

  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Chain<U> | ReadonlyArray<U> | Set<U>,
  ): Chain<U> {
    const ret = this.val.flatMap((el, index, arr) => {
      const mapped = transformer(el, index, arr)
      if (mapped instanceof Chain) return mapped.value()
      if (mapped instanceof Set) return [...mapped]
      return mapped
    })
    return new Chain(ret)
  }

  forEach(
    callback: (el: T, index: number, array: ReadonlyArray<T>) => void,
  ): void {
    this.map(callback)
  }

  groupBy<K extends string | symbol | number>(
    selector: (el: T) => K,
  ): ObjectChain<K, ReadonlyArray<T>> {
    const record = {} as Record<K, Array<T>>
    for (const el of this.val) {
      const key = selector(el)
      if (record[key] != null) {
        record[key]?.push(el)
      } else {
        record[key] = [el]
      }
    }
    return new ObjectChain(record)
  }

  indexOf(searchElement: T, fromIndex?: number): number | undefined {
    // fromIndex will be converted to 0, which is fine here
    const ret = this.val.indexOf(searchElement, fromIndex)
    if (ret === -1) return undefined
    return ret
  }

  lastIndexOf(searchElement: T, fromIndex?: number): number | undefined {
    // fromIndex would be converted to 0, which is NOT fine here
    const ret = this.val.lastIndexOf(searchElement, fromIndex ?? Infinity)
    if (ret === -1) return undefined
    return ret
  }

  includes(el: T, fromIndex?: number): boolean {
    return this.val.includes(el, fromIndex)
  }

  intersect(...arrays: (readonly T[])[]): Chain<T> {
    const ret = intersect(this.val, ...arrays)
    return new Chain(ret)
  }

  join(separator?: string): string {
    return this.val.join(separator)
  }

  mapJoin(separator: string, transformer: (el: T) => string): string {
    return this.reduce((acc, it, idx) => {
      const mapped = transformer(it)
      return acc + (idx > 0 ? separator : "") + mapped
    }, "")
  }

  last(): T {
    return this.lastOrNull() ?? error("No last element found")
  }

  lastOrNull(): T | undefined {
    const last = this.val[this.val.length - 1]
    return last
  }

  map<U>(
    transformer: (el: T, index: number, array: ReadonlyArray<T>) => U,
  ): Chain<U> {
    const mapped = this.val.map(transformer)
    return new Chain(mapped)
  }

  async mapAsync<U>(
    transformer: (el: T, index: number, array: ReadonlyArray<T>) => Promise<U>,
  ): Promise<Chain<U>> {
    const ret = await Promise.all(this.val.map(transformer))
    return new Chain(ret)
  }

  mapNotNullish<O>(transformer: (el: T) => O): Chain<NonNullable<O>> {
    const ret = mapNotNullish(this.val, transformer)
    return new Chain(ret)
  }

  maxBy(selector: (el: T) => string): T | undefined
  maxBy(selector: (el: T) => bigint): T | undefined
  maxBy(selector: (el: T) => number): T | undefined
  maxBy(selector: (el: T) => Date): T | undefined
  maxBy(selector: (el: T) => Date | number | bigint | string): T | undefined {
    // this is save because maxBy is overloaded too
    return maxBy(this.val, selector as (el: T) => string)
  }

  maxOf(selector: (el: T) => bigint): bigint | undefined
  maxOf(selector: (el: T) => number): number | undefined
  maxOf(selector: (el: T) => string): string | undefined
  maxOf(selector: (el: T) => Date): Date | undefined
  maxOf<R extends bigint | number | string | Date>(
    selector: (el: T) => R,
  ): R | undefined {
    if (this.val.length === 0) return undefined
    let max: R = selector(this.val[0])
    for (const el of this.val) {
      const selected = selector(el)
      if (selected > max) max = selected
    }
    return max
  }

  maxWith(comparator: (a: T, b: T) => number): T | undefined {
    return maxWith(this.val, comparator)
  }

  minBy(selector: (el: T) => number): T | undefined
  minBy(selector: (el: T) => string): T | undefined
  minBy(selector: (el: T) => bigint): T | undefined
  minBy(selector: (el: T) => Date): T | undefined
  minBy(selector: (el: T) => Date | number | bigint | string): T | undefined {
    // this is save because minBy is overloaded too
    return minBy(this.val, selector as (el: T) => string)
  }

  minOf(selector: (el: T) => bigint): bigint | undefined
  minOf(selector: (el: T) => number): number | undefined
  minOf(selector: (el: T) => string): string | undefined
  minOf(selector: (el: T) => Date): Date | undefined
  minOf<R extends bigint | number | string | Date>(
    selector: (el: T) => R,
  ): R | undefined {
    if (this.val.length === 0) return undefined
    let min: R = selector(this.val[0])
    for (const el of this.val) {
      const selected = selector(el)
      if (selected < min) min = selected
    }
    return min
  }

  minWith(comparator: (a: T, b: T) => number): T | undefined {
    return minWith(this.val, comparator)
  }

  partition(predicate: (el: T) => boolean): [Chain<T>, Chain<T>] {
    const [left, right] = partition(this.val, predicate)

    return [new Chain(left), new Chain(right)]
  }

  permutations(): Chain<T[]> {
    return new Chain(permutations(this.val))
  }

  reduce(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => T,
  ): T
  reduce(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => T,
    initial: T,
  ): T
  reduce<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O,
    initial: O,
  ): O
  reduce<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O,
    initial?: O,
  ): O {
    return this.val.reduce<O>(reducer, initial as O)
  }

  reduceRight(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => T,
  ): T
  reduceRight(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => T,
    initial: T,
  ): T
  reduceRight<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O,
    initial: O,
  ): O
  reduceRight<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O,
    initial?: O,
  ): O {
    return this.val.reduceRight<O>(reducer, initial as O)
  }

  reverse(): Chain<T> {
    return new Chain([...this.val].reverse())
  }

  runningReduce<O>(
    reducer: (accumulator: O, current: T) => O,
    initialValue: O,
  ): Chain<O> {
    const ret = runningReduce(this.val, reducer, initialValue)
    return new Chain(ret)
  }

  sample(): T | undefined {
    const ret = sample(this.val)
    return ret
  }

  slice(start?: number, end?: number): Chain<T> {
    const ret = this.val.slice(start, end)
    return new Chain(ret)
  }

  slidingWindows(
    size: number,
    { step, partial }: { step: number; partial: boolean },
  ): Chain<T[]> {
    const ret = slidingWindows(this.val, size, { step, partial })
    return new Chain(ret)
  }

  sort(compareFn?: (a: T, b: T) => number): Chain<T> {
    return new Chain([...this.val].sort(compareFn))
  }

  sortBy(selector: (el: T) => Date): Chain<T>
  sortBy(selector: (el: T) => bigint): Chain<T>
  sortBy(selector: (el: T) => string): Chain<T>
  sortBy(selector: (el: T) => number): Chain<T>
  sortBy(selector: (el: T) => Date | bigint | string | number): Chain<T> {
    // this is safe, because sortBy is overloaded as well
    const ret = sortBy(this.val, selector as (el: T) => number)
    return new Chain(ret)
  }

  sumOf(selector: (el: T) => number): number {
    return sumOf(this.val, selector)
  }

  takeLastWhile(predicate: (el: T) => boolean): Chain<T> {
    return new Chain(takeLastWhile(this.val, predicate))
  }

  takeWhile(predicate: (el: T) => boolean): Chain<T> {
    return new Chain(takeWhile(this.val, predicate))
  }

  union(...arrays: (readonly T[])[]): Chain<T> {
    return new Chain(union(this.val, ...arrays))
  }

  unzip(): PairSplit<T> {
    const [left, right] = unzip(this.val as unknown as ReadonlyArray<[T, T]>)
    return [new Chain(left), new Chain(right)] as PairSplit<T>
  }

  withoutAll(values: readonly T[]): Chain<T> {
    const ret = withoutAll(this.val, values)
    return new Chain(ret)
  }

  zip<U>(withArray: readonly U[]): Chain<[T, U]> {
    return new Chain(zip(this.val, withArray))
  }
}
