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

type ArrayOrAsyncChain<U> = Chain<U> | ReadonlyArray<U> | AsyncChainBase<U>

export function objChain<K extends string | number | symbol, T>(
  value: Record<K, T> | ObjectChain<K, T> | Chain<readonly [K, T]>,
): ObjectChain<K, T, Record<K, T>>
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

  async() {
    return asyncChain(this)
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

  filterAsync(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean>,
  ): AsyncChainBase<T> {
    return this.async().filter(predicate)
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

  mapAsync<U>(
    transformer: (el: T, index: number, array: ReadonlyArray<T>) => Promise<U>,
  ): AsyncChainBase<U> {
    return this.async().map(transformer)
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
  sortBy(selector: (el: T) => Date | bigint | string | number): Chain<T>
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

abstract class AsyncChainBase<T> implements Promise<Chain<T>> {
  private _value: Promise<Chain<T>> | null

  protected constructor() {
    this._value = null
  }

  protected startCalclulation() {
    this._value = this.calculate()
  }

  [Symbol.toStringTag] = "AsyncChain"

  async then<TResult1 = Chain<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: Chain<T>) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): Promise<TResult1 | TResult2> {
    return await this.calculate().then(onfulfilled, onrejected)
  }

  async catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined,
  ): Promise<Chain<T> | TResult> {
    return this.then((it) => it, onrejected)
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<Chain<T>> {
    return this.then(
      (it) => it,
      (it) => it,
    ).finally(onfinally)
  }

  abstract calculate(): Promise<Chain<T>>

  async await(): Promise<Chain<T>> {
    return (await this._value) ?? (await this.calculate())
  }

  async value(): Promise<ReadonlyArray<T>> {
    return (await this.await()).value()
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

  // TODO(mr)
  chunk(size: number): AsyncChainBase<T[]> {
    return new ChunkingAsyncChain(this, size)
  }

  concat(other: Iterable<T> | AsyncChainBase<T>): AsyncChainBase<T> {
    return new ConcatenatingAsyncChain(this, other)
  }

  distinct(): AsyncChainBase<T> {
    return this.distinctBy((it) => it)
  }

  distinctBy<D>(selector: (el: T) => D): AsyncChainBase<T> {
    return new DistinctAsyncChain(this, selector)
  }

  drop(num: number): AsyncChainBase<T> {
    return new SliceAsyncChain(this, num)
  }

  dropLast(num: number): AsyncChainBase<T> {
    return new SliceAsyncChain(this, 0, -num)
  }

  take(num: number): AsyncChainBase<T> {
    return new SliceAsyncChain(this, 0, num)
  }

  takeLast(num: number): AsyncChainBase<T> {
    return new SliceAsyncChain(this, -num)
  }

  dropLastWhile(predicate: (el: T) => boolean): AsyncChainBase<T> {
    // TODO(mr) efficiency lol
    return new DropWhileAsyncChain(this.reverse(), predicate).reverse()
  }

  dropWhile(predicate: (el: T) => boolean): AsyncChainBase<T> {
    return new DropWhileAsyncChain(this, predicate)
  }

  async every(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): Promise<boolean>
  async every(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): Promise<boolean> {
    return (await this.await()).every(predicate)
  }

  async some(
    predicate: (value: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): Promise<boolean> {
    return (await this.await()).some(predicate)
  }

  async first(): Promise<T> {
    return (await this.firstOrNull()) ?? error("No first element found")
  }

  async firstOrNull(): Promise<T | undefined> {
    return (await this.await()).firstOrNull()
  }

  filter<S extends T>(
    filter: (el: T, index: number, array: ReadonlyArray<T>) => el is S,
  ): AsyncChainBase<S>
  filter(
    filter: (el: T, index: number, array: ReadonlyArray<T>) => Promise<boolean>,
  ): AsyncChainBase<T>
  filter(
    filter: (el: T, index: number, array: ReadonlyArray<T>) => Promise<boolean>,
  ): AsyncChainBase<T>
  filter(
    filter: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): AsyncChainBase<T>
  filter(
    filter: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): AsyncChainBase<T> {
    return new FilterAsyncChain(this, filter)
  }

  filterNotNullish(): AsyncChainBase<NonNullable<T>> {
    return this.filter((it) => it != null) as AsyncChainBase<NonNullable<T>>
  }

  async find<S extends T>(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => el is S,
  ): Promise<S | undefined>
  async find(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): Promise<T | undefined>
  async find(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): Promise<T | undefined> {
    return (await this.await()).find(predicate)
  }

  async findIndex(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => boolean,
  ): Promise<number | undefined> {
    return (await this.await()).findIndex(predicate)
  }

  async findLast(predicate: (el: T) => boolean): Promise<T | undefined> {
    return (await this.await()).findLast(predicate)
  }

  async findLastIndex(
    predicate: (el: T) => boolean,
  ): Promise<number | undefined> {
    return (await this.await()).findLastIndex(predicate)
  }

  async findSingle(predicate: (el: T) => boolean): Promise<T | undefined> {
    return (await this.await()).findSingle(predicate)
  }

  async firstNotNullishOf<O>(
    selector: (item: T) => O | undefined | null,
  ): Promise<NonNullable<O> | undefined> {
    return (await this.await()).firstNotNullishOf(selector)
  }

  flatten(): FlattenAsyncChain<T> {
    return new FlattenAsyncChain(this)
  }

  flatMap<U>(
    transformer: (el: T, index: number, array: ReadonlyArray<T>) => Chain<U>,
  ): FlattenAsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => ReadonlyArray<U>,
  ): FlattenAsyncChain<U>
  flatMap<U>(
    transformer: (el: T, index: number, array: ReadonlyArray<T>) => Set<U>,
  ): FlattenAsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => AsyncChainBase<U>,
  ): FlattenAsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Chain<U> | ReadonlyArray<U> | Set<U> | AsyncChainBase<U>,
  ): FlattenAsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Chain<U> | ReadonlyArray<U> | Set<U> | AsyncChainBase<U>,
  ): FlattenAsyncChain<U> {
    const mapped = this.map(transformer)
    // @ts-expect-error trust me bro
    return mapped.flatten()
  }

  async forEach(
    callback: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => void | Promise<void>,
  ): Promise<void> {
    await this.map(callback).value()
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

  async indexOf(
    searchElement: T,
    fromIndex?: number,
  ): Promise<number | undefined> {
    return (await this.await()).indexOf(searchElement, fromIndex)
  }

  async lastIndexOf(
    searchElement: T,
    fromIndex?: number,
  ): Promise<number | undefined> {
    return (await this.await()).lastIndexOf(searchElement, fromIndex)
  }

  async includes(el: T, fromIndex?: number): Promise<boolean> {
    return (await this.await()).includes(el, fromIndex)
  }

  intersect(
    ...arrays: Array<ReadonlyArray<T> | AsyncChainBase<T>>
  ): AsyncChainBase<T> {
    return new IntersectionAsyncChain(this, arrays)
  }

  async join(separator?: string): Promise<string> {
    return (await this.await()).join(separator)
  }

  async mapJoin(
    separator: string,
    transformer: (el: T) => string | Promise<string>,
  ): Promise<string> {
    return this.reduce(async (acc, it, idx) => {
      const mapped = transformer(it)
      return acc + (idx > 0 ? separator : "") + mapped
    }, "")
  }

  async last(): Promise<T> {
    return (await this.lastOrNull()) ?? error("No last element found")
  }

  async lastOrNull(): Promise<T | undefined> {
    return (await this.await()).lastOrNull()
  }

  map<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => U | Promise<U>,
  ): AsyncChainBase<U> {
    return new MappingAsyncChain(this, transformer)
  }

  mapNotNullish<O>(transformer: (el: T) => O): AsyncChainBase<NonNullable<O>> {
    return this.map(transformer).filterNotNullish()
  }

  async maxBy(selector: (el: T) => string): Promise<T | undefined>
  async maxBy(selector: (el: T) => bigint): Promise<T | undefined>
  async maxBy(selector: (el: T) => number): Promise<T | undefined>
  async maxBy(selector: (el: T) => Date): Promise<T | undefined>
  async maxBy(
    selector: (el: T) => Date | number | bigint | string,
  ): Promise<T | undefined> {
    // this is save because maxBy is overloaded too
    return (await this.await()).maxBy(selector as (el: T) => string)
  }

  async maxOf(selector: (el: T) => bigint): Promise<bigint | undefined>
  async maxOf(selector: (el: T) => number): Promise<number | undefined>
  async maxOf(selector: (el: T) => string): Promise<string | undefined>
  async maxOf(selector: (el: T) => Date): Promise<Date | undefined>
  async maxOf(
    selector: (el: T) => bigint | number | string | Date,
  ): Promise<bigint | number | string | Date | undefined> {
    return (await this.await()).maxOf(
      selector as (el: T) => bigint | number | string | Date,
    )
  }

  async maxWith(comparator: (a: T, b: T) => number): Promise<T | undefined> {
    return (await this.await()).maxWith(comparator)
  }

  async minBy(selector: (el: T) => number): Promise<T | undefined>
  async minBy(selector: (el: T) => string): Promise<T | undefined>
  async minBy(selector: (el: T) => bigint): Promise<T | undefined>
  async minBy(selector: (el: T) => Date): Promise<T | undefined>
  async minBy(
    selector: (el: T) => Date | number | bigint | string,
  ): Promise<T | undefined> {
    return (await this.await()).minBy(selector as (el: T) => string)
  }

  async minOf(selector: (el: T) => bigint): Promise<bigint | undefined>
  async minOf(selector: (el: T) => number): Promise<number | undefined>
  async minOf(selector: (el: T) => string): Promise<string | undefined>
  async minOf(selector: (el: T) => Date): Promise<Date | undefined>
  async minOf(
    selector: (el: T) => bigint | number | string | Date,
  ): Promise<bigint | number | string | Date | undefined> {
    return (await this.await()).minOf(
      selector as (el: T) => bigint | number | string | Date,
    )
  }

  async minWith(comparator: (a: T, b: T) => number): Promise<T | undefined> {
    return (await this.await()).minWith(comparator)
  }

  partition(
    predicate: (el: T) => Promise<boolean> | boolean,
  ): [AsyncChainBase<T>, AsyncChainBase<T>] {
    return [this.filter(predicate), this.filter((el) => !predicate(el))]
  }

  permutations(): AsyncChainBase<ReadonlyArray<T>> {
    return new PermutationsAsyncChain(this)
  }

  async reduce(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => T,
  ): Promise<T>
  async reduce(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<T>,
  ): Promise<T>
  async reduce(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<T> | T,
  ): Promise<T>
  async reduce(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => T,
    initial: T,
  ): Promise<T>
  async reduce(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<T>,
    initial: T,
  ): Promise<T>
  async reduce(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<T> | T,
    initial: T,
  ): Promise<T>
  async reduce<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O,
    initial: O,
  ): Promise<O>
  async reduce<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<O>,
    initial: O,
  ): Promise<O>
  async reduce<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O | Promise<O>,
    initial: O,
  ): Promise<O>
  async reduce<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O | Promise<O>,
    initial?: O,
  ): Promise<O>
  async reduce<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O | Promise<O>,
    initial?: O,
  ): Promise<O> {
    let ret: O = initial != null ? initial : ((await this.firstOrNull()) as O)

    const values = await this.value()
    for (let i = initial != null ? 0 : 1; i < values.length; i++) {
      ret = await reducer(ret as O, values[i], i, values)
    }
    return ret
  }

  async reduceRight(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => T,
  ): Promise<T>
  async reduceRight(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<T>,
  ): Promise<T>
  async reduceRight(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<T> | T,
  ): Promise<T>
  async reduceRight(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => T,
    initial: T,
  ): Promise<T>
  async reduceRight(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<T>,
    initial: T,
  ): Promise<T>
  async reduceRight(
    reducer: (
      accumulator: T,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<T> | T,
    initial: T,
  ): Promise<T>
  async reduceRight<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O,
    initial: O,
  ): Promise<O>
  async reduceRight<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<O>,
    initial: O,
  ): Promise<O>
  async reduceRight<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O | Promise<O>,
    initial: O,
  ): Promise<O>
  async reduceRight<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O | Promise<O>,
    initial?: O,
  ): Promise<O>
  async reduceRight<O>(
    reducer: (
      accumulator: O,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => O | Promise<O>,
    initial?: O,
  ): Promise<O> {
    return await this.reverse().reduce(reducer, initial)
  }

  reverse(): AsyncChainBase<T> {
    return new ReversingAsyncChain(this)
  }

  runningReduce<O>(
    reducer: (accumulator: O, current: T) => O,
    initialValue: O,
  ): AsyncChainBase<O> {
    return new RunningReduceAsyncChain(this, reducer, initialValue)
  }

  async sample(): Promise<T | undefined> {
    return (await this.await()).sample()
  }

  slice(start?: number, end?: number): AsyncChainBase<T> {
    return new SliceAsyncChain(this, start, end)
  }

  slidingWindows(
    size: number,
    { step, partial }: { step: number; partial: boolean },
  ): AsyncChainBase<ReadonlyArray<T>> {
    return new SlidingWindowAsyncChain(this, size, { step, partial })
  }

  sort(compareFn?: (a: T, b: T) => number): AsyncChainBase<T> {
    return new SortingAsyncChain(this, compareFn)
  }

  sortBy(selector: (el: T) => Date): AsyncChainBase<T>
  sortBy(selector: (el: T) => Promise<Date>): AsyncChainBase<T>
  sortBy(selector: (el: T) => Promise<Date> | Date): AsyncChainBase<T>
  sortBy(selector: (el: T) => bigint): AsyncChainBase<T>
  sortBy(selector: (el: T) => Promise<bigint>): AsyncChainBase<T>
  sortBy(selector: (el: T) => Promise<bigint> | bigint): AsyncChainBase<T>
  sortBy(selector: (el: T) => string): AsyncChainBase<T>
  sortBy(selector: (el: T) => Promise<string>): AsyncChainBase<T>
  sortBy(selector: (el: T) => Promise<string> | string): AsyncChainBase<T>
  sortBy(selector: (el: T) => number): AsyncChainBase<T>
  sortBy(selector: (el: T) => Promise<number>): AsyncChainBase<T>
  sortBy(selector: (el: T) => Promise<number> | number): AsyncChainBase<T>
  sortBy(
    selector: (el: T) => Date | bigint | string | number,
  ): AsyncChainBase<T>
  sortBy(
    selector: (el: T) => Promise<Date | bigint | string | number>,
  ): AsyncChainBase<T>
  sortBy(
    selector: (
      el: T,
    ) =>
      | Promise<Date | bigint | string | number>
      | Date
      | bigint
      | string
      | number,
  ): AsyncChainBase<T>
  sortBy(
    selector: (
      el: T,
    ) =>
      | Promise<Date | bigint | string | number>
      | Date
      | bigint
      | string
      | number,
  ): AsyncChainBase<T> {
    return new SortByAsyncChain(this, selector)
  }

  async sumOf(selector: (el: T) => Promise<number> | number): Promise<number> {
    return (await this.map(selector).await()).sumOf((it) => it)
  }

  takeLastWhile(predicate: (el: T) => boolean): AsyncChainBase<T> {
    // TODO(mr) efficiency lol
    return new TakeWhileAsyncChain(this.reverse(), predicate).reverse()
  }

  takeWhile(predicate: (el: T) => boolean): AsyncChainBase<T> {
    return new TakeWhileAsyncChain(this, predicate)
  }

  union(...arrays: (readonly T[] | AsyncChainBase<T>)[]): AsyncChainBase<T> {
    return new UnionAsyncChain(this, arrays)
  }

  unzip(): PairSplit<T> {
    const [left, right] = unzip(this.val as unknown as ReadonlyArray<[T, T]>)
    return [new Chain(left), new Chain(right)] as PairSplit<T>
  }

  withoutAll(values: readonly T[]): Chain<T> {
    const ret = withoutAll(this.val, values)
    return new Chain(ret)
  }

  zip<U>(withArray: readonly U[] | AsyncChainBase<U>): AsyncChainBase<[T, U]> {
    return new ZippingAsyncChain(this, withArray)
  }
}

export class DistinctAsyncChain<T, D> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private selector: (el: T) => D,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).distinctBy(this.selector)
  }
}

export class SliceAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private start?: number,
    private end?: number,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).slice(this.start, this.end)
  }
}

export class FilterAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const current = await this.val.await()
    const mask = await asyncChain(current).map(this.predicate).value()

    return current.filter((_, index) => mask[index])
  }
}

type FlattenAsyncType<T> = Distribute<T> extends {
  type: ArrayOrAsyncChain<infer U>
}
  ? U
  : T

export class FlattenAsyncChain<T> extends AsyncChainBase<FlattenAsyncType<T>> {
  constructor(private val: AsyncChainBase<T>) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<FlattenAsyncType<T>>> {
    return (await this.val.await()).flatten() as Chain<FlattenAsyncType<T>>
  }
}

export class MappingAsyncChain<T, U> extends AsyncChainBase<U> {
  constructor(
    private val: AsyncChainBase<T>,
    private transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => U | Promise<U>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<U>> {
    return asyncChain(
      (await this.val.await()).map(
        async (el, index, array) =>
          await this.transformer(await el, index, array),
      ),
    ).await()
  }
}

export class SortByAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private selector: (
      a: T,
    ) =>
      | Promise<Date | bigint | string | number>
      | Date
      | bigint
      | string
      | number,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const values = await this.val
      .map(async (el) => [el, await this.selector(el)] as const)
      .await()
    return values.sortBy((it) => it[1]).map((it) => it[0])
  }
}

export class SortingAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private compareFn?: (a: T, b: T) => number,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).sort(this.compareFn)
  }
}

export class ReversingAsyncChain<T> extends AsyncChainBase<T> {
  constructor(private val: AsyncChainBase<T>) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).reverse()
  }
}

export class PermutationsAsyncChain<T> extends AsyncChainBase<
  ReadonlyArray<T>
> {
  constructor(private val: AsyncChainBase<T>) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<ReadonlyArray<T>>> {
    return (await this.val.await()).permutations()
  }
}

export class TakeWhileAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const values = await this.val.value()
    const ret: Array<T> = []
    for (let i = 0; i < values.length; i++) {
      if (await this.predicate(values[i], i, values)) {
        ret.push(values[i])
      } else {
        break
      }
    }

    return new Chain(ret)
  }
}

export class DropWhileAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const values = await this.val.value()
    const ret: Array<T> = []
    for (let i = 0; i < values.length; i++) {
      if (!(await this.predicate(values[i], i, values))) {
        break
      } else {
        ret.push(values[i])
      }
    }

    return new Chain(ret)
  }
}

export class ZippingAsyncChain<T, U> extends AsyncChainBase<[T, U]> {
  constructor(
    private val: AsyncChainBase<T>,
    private withArray: readonly U[] | AsyncChainBase<U>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<[T, U]>> {
    const other =
      this.withArray instanceof AsyncChainBase
        ? await this.withArray.value()
        : this.withArray
    return (await this.val.await()).zip(other)
  }
}

export class UnionAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private withArrays: ReadonlyArray<readonly T[] | AsyncChainBase<T>>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const other = await Promise.all(
      this.withArrays.map(async (it) =>
        it instanceof AsyncChainBase ? await it.value() : it,
      ),
    )

    return (await this.val.await()).union(...other)
  }
}

export class RunningReduceAsyncChain<T, O> extends AsyncChainBase<O> {
  constructor(
    private val: AsyncChainBase<T>,
    private reducer: (accumulator: O, current: T) => Promise<O> | O,
    private initialValue: O,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<O>> {
    const ret = await this.val.reduce(
      async (acc, it) => {
        const elem = acc[acc.length - 1]
        const next = await this.reducer(elem, it)
        return [...acc, next]
      },
      [this.initialValue],
    )

    return chain(ret)
  }
}

export class ConcatenatingAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private other: AsyncChainBase<T> | Iterable<T>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const adding =
      this.other instanceof AsyncChainBase
        ? await this.other.await()
        : this.other
    return (await this.val.await()).concat(adding)
  }
}

export class ChunkingAsyncChain<T> extends AsyncChainBase<T[]> {
  constructor(
    private val: AsyncChainBase<T>,
    private size: number,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T[]>> {
    const chunks = chunk(await this.val.value(), this.size)
    return new AsyncChain(chunks)
  }
}

export class IntersectionAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private withArrays: ReadonlyArray<readonly T[] | AsyncChainBase<T>>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const others = await Promise.all(
      this.withArrays.map(async (it) =>
        it instanceof AsyncChainBase ? await it.value() : it,
      ),
    )
    const ret = intersect(await this.val.value(), ...others)
    return chain(ret)
  }
}

export class SlidingWindowAsyncChain<T> extends AsyncChainBase<
  ReadonlyArray<T>
> {
  constructor(
    private val: AsyncChainBase<T>,
    private size: number,
    private options: {
      step?: number
      partial?: boolean
    },
  ) {
    super()
  }

  async calculate(): Promise<Chain<ReadonlyArray<T>>> {
    const ret = slidingWindows(await this.val.value(), this.size, this.options)
    return new Chain(ret)
  }
}

export function asyncChain<T>(val: Chain<Promise<T> | T>): AsyncChain<T>
export function asyncChain<T>(val: ReadonlyArray<Promise<T> | T>): AsyncChain<T>
export function asyncChain<T>(
  val: ReadonlyArray<Promise<T> | T> | Chain<Promise<T> | T>,
): AsyncChain<T> {
  if (val instanceof Chain) return new AsyncChain(val.value())
  return new AsyncChain(val)
}

export class AsyncChain<T> extends AsyncChainBase<T> {
  constructor(private val: ReadonlyArray<Promise<T> | T>) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return new Chain(await Promise.all(this.val))
  }
}
