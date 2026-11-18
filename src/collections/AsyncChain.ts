import {
  chain,
  Chain,
  IfString,
  objChain,
  ObjectChain,
  PairSplit,
} from "../collections"
import {
  chunk,
  intersect,
  slidingWindows,
} from "@opencreek/deno-std-collections"
import { error } from "../error"
import { groupEntries } from "./groupEntries"

export type ArrayOrAsyncChain<U> = Chain<U> | ReadonlyArray<U> | AsyncChain<U>

export function asyncChain<T>(val: Iterable<Promise<T> | T>): AsyncChain<T>
export function asyncChain<_T>(val: undefined | null): undefined
export function asyncChain<T>(
  val: Iterable<Promise<T> | T> | undefined | null,
): AsyncChain<T> | undefined
export function asyncChain<T>(
  val: Iterable<Promise<T> | T> | undefined | null,
): AsyncChain<T> | undefined {
  if (val == null) return undefined
  return new SimpleAsyncChain(chain(val).value())
}

async function toArray<U>(
  val: Iterable<U> | AsyncChain<U>,
): Promise<ReadonlyArray<U>> {
  if (val instanceof AsyncChain) return val.value()
  return chain(val).value()
}

export function asyncObjChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
>(
  val: Rec | ObjectChain<K, T, Rec> | Promise<Rec | ObjectChain<K, T, Rec>>,
): AsyncObjectChain<K, T, Rec> {
  return new SimpleAsyncObjectChain(val)
}

export abstract class AsyncChain<T> implements Promise<Chain<T>> {
  private _value: Promise<Chain<T>> | null

  protected constructor() {
    this._value = null
  }

  protected startCalculation() {
    this._value = this._value ?? this.calculate()
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
    return await this.await().then(onfulfilled, onrejected)
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
    return this.await().finally(onfinally)
  }

  abstract calculate(): Promise<Chain<T>>

  async await(): Promise<Chain<T>> {
    void this.startCalculation()
    return (await this._value) ?? error("No promise after starting calculation")
  }

  async value(): Promise<ReadonlyArray<T>> {
    return (await this.await()).value()
  }

  async writableValue(): Promise<Array<T>> {
    return (await this.await()).writableValue()
  }

  async toSet(): Promise<Set<T>> {
    return (await this.await()).toSet()
  }

  associateBy<S extends string | number | symbol>(
    selector: (el: T) => S | Promise<S>,
  ): AsyncObjectChain<S, T> {
    return new AssociatingAsyncObjectChain(this, selector)
  }

  associateWith<U>(
    selector: (key: string) => U | Promise<U>,
  ): IfString<T, AsyncObjectChain<string, U>> {
    return this.associateBy((el) => el as unknown as string).mapValues(
      selector as (value: T) => U | Promise<U>,
    ) as IfString<T, AsyncObjectChain<string, U>>
  }

  chunk(size: number): AsyncChain<T[]> {
    return new ChunkingAsyncChain(this, size)
  }

  concat(other: Iterable<T> | AsyncChain<T>): AsyncChain<T> {
    return new ConcatenatingAsyncChain(this, other)
  }

  distinct(): AsyncChain<T> {
    return this.distinctBy((it) => it)
  }

  distinctBy<D>(selector: (el: T) => D | Promise<D>): AsyncChain<T> {
    return new DistinctAsyncChain(this, selector)
  }

  drop(num: number): AsyncChain<T> {
    return new SliceAsyncChain(this, num)
  }

  dropLast(num: number): AsyncChain<T> {
    return new DerivedAsyncChain(this, (it) => it.dropLast(num))
  }

  take(num: number): AsyncChain<T> {
    return new SliceAsyncChain(this, 0, num)
  }

  takeLast(num: number): AsyncChain<T> {
    return new DerivedAsyncChain(this, (it) => it.takeLast(num))
  }

  dropLastWhile(
    predicate: (el: T) => Promise<boolean> | boolean,
  ): AsyncChain<T> {
    return new DropLastWhileAsyncChain(this, predicate)
  }

  dropWhile(predicate: (el: T) => Promise<boolean> | boolean): AsyncChain<T> {
    return new DropWhileAsyncChain(this, predicate)
  }

  async every(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): Promise<boolean>
  async every(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): Promise<boolean> {
    const val = await this.value()
    for (let i = 0; i < val.length; i++) {
      if (!(await predicate(val[i], i, val))) {
        return false
      }
    }
    return true
  }

  async some(
    predicate: (
      value: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): Promise<boolean> {
    const val = await this.value()
    for (let i = 0; i < val.length; i++) {
      if (await predicate(val[i], i, val)) {
        return true
      }
    }
    return false
  }

  async first(): Promise<T> {
    return (await this.firstOrNull()) ?? error("No first element found")
  }

  async firstOrNull(): Promise<T | undefined> {
    return (await this.await()).firstOrNull()
  }

  filter<S extends T>(
    filter: (el: T, index: number, array: ReadonlyArray<T>) => el is S,
  ): AsyncChain<S>
  filter(
    filter: (el: T, index: number, array: ReadonlyArray<T>) => Promise<boolean>,
  ): AsyncChain<T>
  filter(
    filter: (el: T, index: number, array: ReadonlyArray<T>) => Promise<boolean>,
  ): AsyncChain<T>
  filter(
    filter: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): AsyncChain<T>
  filter(
    filter: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): AsyncChain<T> {
    return new FilterAsyncChain(this, filter)
  }

  filterNotNullish(): AsyncChain<NonNullable<T>> {
    return this.filter((it) => it != null) as AsyncChain<NonNullable<T>>
  }

  async find<S extends T>(
    predicate: (el: T, index: number, array: ReadonlyArray<T>) => el is S,
  ): Promise<S | undefined>
  async find(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): Promise<T | undefined>
  async find(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): Promise<T | undefined> {
    const index = await this.findIndex(predicate)
    if (index == undefined) return undefined
    return (await this.value())[index]
  }

  async findIndex(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): Promise<number | undefined> {
    const val = await this.value()
    for (let i = 0; i < val.length; i++) {
      if (await predicate(val[i], i, val)) {
        return i
      }
    }
    return undefined
  }

  async findLast(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): Promise<T | undefined> {
    const index = await this.findLastIndex(predicate)
    if (index == undefined) return undefined
    return (await this.value())[index]
  }

  async findLastIndex(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): Promise<number | undefined> {
    const val = await this.value()
    for (let i = val.length - 1; i >= 0; i--) {
      if (await predicate(val[i], i, val)) {
        return i
      }
    }
    return undefined
  }

  async findSingle(
    predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ): Promise<T | undefined> {
    const val = await this.value()
    let found: number | undefined
    for (let i = 0; i < val.length; i++) {
      if (await predicate(val[i], i, val)) {
        if (found !== undefined) return undefined
        found = i
      }
    }
    return found === undefined ? undefined : val[found]
  }

  async firstNotNullishOf<O>(
    selector: (item: T) => Promise<O | undefined | null> | O | undefined | null,
  ): Promise<NonNullable<O> | undefined> {
    const val = await this.value()
    for (let i = 0; i < val.length; i++) {
      const res = await selector(val[i])
      if (res != null) return res
    }
    return undefined
  }

  flatten(): AsyncChain<FlattenAsyncType<T>> {
    return new FlattenAsyncChain(this)
  }

  flatMap<U>(
    transformer: (el: T, index: number, array: ReadonlyArray<T>) => Chain<U>,
  ): AsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<ReadonlyArray<U>> | ReadonlyArray<U>,
  ): AsyncChain<U>
  flatMap<U>(
    transformer: (el: T, index: number, array: ReadonlyArray<T>) => Set<U>,
  ): AsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => AsyncChain<U>,
  ): AsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Chain<U> | ReadonlyArray<U> | Set<U> | AsyncChain<U>,
  ): AsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) =>
      | Chain<U>
      | ReadonlyArray<U>
      | Set<U>
      | AsyncChain<U>
      | Promise<ReadonlyArray<U>>,
  ): AsyncChain<U> {
    const mapped = this.map(transformer)
    return mapped.flatten() as unknown as AsyncChain<U>
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
    selector: (el: T) => K | Promise<K>,
  ): AsyncObjectChain<K, ReadonlyArray<T>> {
    return new GroupingAsyncObjectChain(this, selector)
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

  intersect(...arrays: Array<Iterable<T> | AsyncChain<T>>): AsyncChain<T> {
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
      const mapped = await transformer(it)
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
  ): AsyncChain<U> {
    return new MappingAsyncChain(this, transformer)
  }

  mapNotNullish<O>(
    transformer: (el: T) => Promise<O> | O,
  ): AsyncChain<NonNullable<O>> {
    return this.map(transformer).filterNotNullish()
  }

  async maxBy(
    selector: (el: T) => Promise<string> | string,
  ): Promise<T | undefined>
  async maxBy(
    selector: (el: T) => Promise<bigint> | bigint,
  ): Promise<T | undefined>
  async maxBy(
    selector: (el: T) => Promise<number> | number,
  ): Promise<T | undefined>
  async maxBy(selector: (el: T) => Promise<Date> | Date): Promise<T | undefined>
  async maxBy(
    selector: (
      el: T,
    ) =>
      | Date
      | number
      | bigint
      | string
      | Promise<string | bigint | number | Date>,
  ): Promise<T | undefined> {
    let max: number | string | bigint | Date | undefined
    let ret: T | undefined

    for (const elem of await this.value()) {
      const elemValue = await selector(elem)
      if (max == null || elemValue > max) {
        max = elemValue
        ret = elem
      }
    }
    return ret
  }

  async maxOf(
    selector: (el: T) => Promise<bigint> | bigint,
  ): Promise<bigint | undefined>
  async maxOf(
    selector: (el: T) => Promise<number> | number,
  ): Promise<number | undefined>
  async maxOf(
    selector: (el: T) => Promise<string> | string,
  ): Promise<string | undefined>
  async maxOf(
    selector: (el: T) => Promise<Date> | Date,
  ): Promise<Date | undefined>
  async maxOf(
    selector: (
      el: T,
    ) =>
      | bigint
      | number
      | string
      | Date
      | Promise<string | bigint | number | Date>,
  ): Promise<bigint | number | string | Date | undefined> {
    return (
      (await this.map(selector))
        // We need to cast, because of the overloads. We know it's safe because of our overloads though
        .maxOf((it) => it as string)
    )
  }

  async maxWith(comparator: (a: T, b: T) => number): Promise<T | undefined> {
    return (await this.await()).maxWith(comparator)
  }

  async minBy(
    selector: (el: T) => Promise<string> | string,
  ): Promise<T | undefined>
  async minBy(
    selector: (el: T) => Promise<bigint> | bigint,
  ): Promise<T | undefined>
  async minBy(
    selector: (el: T) => Promise<number> | number,
  ): Promise<T | undefined>
  async minBy(selector: (el: T) => Promise<Date> | Date): Promise<T | undefined>
  async minBy(
    selector: (
      el: T,
    ) =>
      | Date
      | number
      | bigint
      | string
      | Promise<string | bigint | number | Date>,
  ): Promise<T | undefined> {
    let min: number | string | bigint | Date | undefined
    let ret: T | undefined

    for (const elem of await this.value()) {
      const elemValue = await selector(elem)
      if (min == null || elemValue < min) {
        min = elemValue
        ret = elem
      }
    }
    return ret
  }

  async minOf(
    selector: (el: T) => Promise<bigint> | bigint,
  ): Promise<bigint | undefined>
  async minOf(
    selector: (el: T) => Promise<number> | number,
  ): Promise<number | undefined>
  async minOf(
    selector: (el: T) => Promise<string> | string,
  ): Promise<string | undefined>
  async minOf(
    selector: (el: T) => Promise<Date> | Date,
  ): Promise<Date | undefined>
  async minOf(
    selector: (
      el: T,
    ) =>
      | bigint
      | number
      | string
      | Date
      | Promise<string | bigint | number | Date>,
  ): Promise<bigint | number | string | Date | undefined> {
    return (
      (await this.map(selector))
        // We need to cast, because of the overloads. We know it's safe because of our overloads though
        .minOf((it) => it as string)
    )
  }

  async minWith(comparator: (a: T, b: T) => number): Promise<T | undefined> {
    return (await this.await()).minWith(comparator)
  }

  partition(
    predicate: (el: T) => Promise<boolean> | boolean,
  ): [AsyncChain<T>, AsyncChain<T>] {
    // Evaluate the predicate exactly once per element. The shared `evaluated`
    // chain is memoized, so both branches reuse the same computation instead of
    // running the (possibly async / side-effecting) predicate twice.
    const evaluated = this.map(async (el) => [el, await predicate(el)] as const)
    return [
      evaluated.filter(([, keep]) => keep).map(([el]) => el),
      evaluated.filter(([, keep]) => !keep).map(([el]) => el),
    ]
  }

  permutations(): AsyncChain<ReadonlyArray<T>> {
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
    ...initial: [] | [O]
  ): Promise<O | undefined> {
    const values = await this.value()
    // an explicit `undefined`/`null` initial value is still an initial value
    if (!initial.length && !values.length) {
      throw new TypeError("Reduce of empty array with no initial value")
    }
    let ret = initial.length ? initial[0] : (values[0] as unknown as O)
    for (let i = initial.length ? 0 : 1; i < values.length; i++) {
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
    ...initial: [] | [O]
  ): Promise<O> {
    const values = await this.value()
    const last = values.length - 1
    if (!initial.length && !values.length) {
      throw new TypeError("Reduce of empty array with no initial value")
    }
    let ret = initial.length ? initial[0] : (values[last] as unknown as O)
    for (let i = initial.length ? last : last - 1; i >= 0; i--) {
      ret = await reducer(ret as O, values[i], i, values)
    }
    return ret as O
  }

  reverse(): AsyncChain<T> {
    return new ReversingAsyncChain(this)
  }

  runningReduce<O>(
    reducer: (accumulator: O, current: T) => O | Promise<O>,
    initialValue: O,
  ): AsyncChain<O> {
    return new RunningReduceAsyncChain(this, reducer, initialValue)
  }

  async sample(): Promise<T | undefined> {
    return (await this.await()).sample()
  }

  slice(start?: number, end?: number): AsyncChain<T> {
    return new SliceAsyncChain(this, start, end)
  }

  slidingWindows(
    size: number,
    { step, partial }: { step: number; partial: boolean },
  ): AsyncChain<ReadonlyArray<T>> {
    return new SlidingWindowAsyncChain(this, size, { step, partial })
  }

  sort(compareFn?: (a: T, b: T) => number): AsyncChain<T> {
    return new SortingAsyncChain(this, compareFn)
  }

  sortBy(selector: (el: T) => Date): AsyncChain<T>
  sortBy(selector: (el: T) => Promise<Date>): AsyncChain<T>
  sortBy(selector: (el: T) => Promise<Date> | Date): AsyncChain<T>
  sortBy(selector: (el: T) => bigint): AsyncChain<T>
  sortBy(selector: (el: T) => Promise<bigint>): AsyncChain<T>
  sortBy(selector: (el: T) => Promise<bigint> | bigint): AsyncChain<T>
  sortBy(selector: (el: T) => string): AsyncChain<T>
  sortBy(selector: (el: T) => Promise<string>): AsyncChain<T>
  sortBy(selector: (el: T) => Promise<string> | string): AsyncChain<T>
  sortBy(selector: (el: T) => number): AsyncChain<T>
  sortBy(selector: (el: T) => Promise<number>): AsyncChain<T>
  sortBy(selector: (el: T) => Promise<number> | number): AsyncChain<T>
  sortBy(selector: (el: T) => Date | bigint | string | number): AsyncChain<T>
  sortBy(
    selector: (el: T) => Promise<Date | bigint | string | number>,
  ): AsyncChain<T>
  sortBy(
    selector: (
      el: T,
    ) =>
      | Promise<Date | bigint | string | number>
      | Date
      | bigint
      | string
      | number,
  ): AsyncChain<T>
  sortBy(
    selector: (
      el: T,
    ) =>
      | Promise<Date | bigint | string | number>
      | Date
      | bigint
      | string
      | number,
  ): AsyncChain<T> {
    return new SortByAsyncChain(this, selector)
  }

  async sumOf(selector: (el: T) => Promise<number> | number): Promise<number> {
    return (await this.map(selector).await()).sumOf((it) => it)
  }

  takeLastWhile(
    predicate: (el: T) => Promise<boolean> | boolean,
  ): AsyncChain<T> {
    return new TakeLastWhileAsyncChain(this, predicate)
  }

  takeWhile(predicate: (el: T) => Promise<boolean> | boolean): AsyncChain<T> {
    return new TakeWhileAsyncChain(this, predicate)
  }

  union(...arrays: Array<Iterable<T> | AsyncChain<T>>): AsyncChain<T> {
    return new UnionAsyncChain(this, arrays)
  }

  async unzip(): Promise<PairSplit<T>> {
    return (await this.await()).unzip()
  }

  withoutAll(values: Iterable<T> | AsyncChain<T>): AsyncChain<T> {
    return new WithoutAllAsyncChain(this, values)
  }

  zip<U>(withArray: Iterable<U> | AsyncChain<U>): AsyncChain<[T, U]> {
    return new ZippingAsyncChain(this, withArray)
  }
}

class DerivedAsyncChain<T, U> extends AsyncChain<U> {
  constructor(
    private val: AsyncChain<T>,
    private derive: (val: Chain<T>) => Chain<U>,
  ) {
    super()
  }

  async calculate(): Promise<Chain<U>> {
    return this.derive(await this.val.await())
  }
}

class SimpleAsyncChain<T> extends AsyncChain<T> {
  constructor(private val: ReadonlyArray<Promise<T> | T>) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    return new Chain(await Promise.all(this.val))
  }
}

class ChunkingAsyncChain<T> extends AsyncChain<T[]> {
  constructor(
    private val: AsyncChain<T>,
    private size: number,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T[]>> {
    const chunks = chunk(await this.val.value(), this.size)
    return new Chain(chunks)
  }
}

class ConcatenatingAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private other: AsyncChain<T> | Iterable<T>,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).concat(await toArray(this.other))
  }
}

class DistinctAsyncChain<T, D> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private selector: (el: T) => D | Promise<D>,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    const keyed = await this.val.map(
      async (el) => [el, await this.selector(el)] as const,
    )
    return keyed.distinctBy(([, key]) => key).map(([el]) => el)
  }
}

class DropWhileAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    const values = await this.val.await()
    let count = 0
    for (let i = 0; i < values.value().length; i++) {
      if (!(await this.predicate(values.value()[i], i, values.value()))) {
        break
      }
      count++
    }

    return values.drop(count)
  }
}

class DropLastWhileAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    const values = await this.val.await()
    let count = 0
    for (let i = values.value().length - 1; i >= 0; i--) {
      if (!(await this.predicate(values.value()[i], i, values.value()))) {
        break
      }
      count++
    }

    return values.dropLast(count)
  }
}

class EntriesAsyncChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends AsyncChain<[K, T]> {
  constructor(private val: AsyncObjectChain<K, T, Rec>) {
    super()
  }

  async calculate(): Promise<Chain<[K, T]>> {
    return (await this.val.await()).entries()
  }
}

class FilterAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    const current = await this.val.await()
    const mask = await asyncChain(current).map(this.predicate).value()

    return current.filter((_, index) => mask[index])
  }
}

type Distribute<U> = U extends any ? { type: U } : never

// nested AsyncChains are awaited (they are thenables), so they arrive as Chains here
type FlattenAsyncType<T> =
  Distribute<T> extends {
    type: Chain<infer U> | ReadonlyArray<infer U> | Set<infer U>
  }
    ? U
    : T

class FlattenAsyncChain<T> extends AsyncChain<FlattenAsyncType<T>> {
  constructor(private val: AsyncChain<T>) {
    super()
  }

  async calculate(): Promise<Chain<FlattenAsyncType<T>>> {
    const flattened = (await this.val.await()).map((el) =>
      el instanceof Set ? [...(el as Set<unknown>)] : el,
    )

    return flattened.flatten() as Chain<FlattenAsyncType<T>>
  }
}

class IntersectionAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private withArrays: ReadonlyArray<Iterable<T> | AsyncChain<T>>,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    const others = await Promise.all(this.withArrays.map(toArray))
    const ret = intersect(await this.val.value(), ...others)
    return chain(ret)
  }
}

class KeysAsyncChain<K extends string | number | symbol> extends AsyncChain<K> {
  constructor(private val: AsyncObjectChain<K, any>) {
    super()
  }

  async calculate(): Promise<Chain<K>> {
    return (await this.val.await()).keys()
  }
}

class MappingAsyncChain<T, U> extends AsyncChain<U> {
  constructor(
    private val: AsyncChain<T>,
    private transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => U | Promise<U>,
  ) {
    super()
  }

  async calculate(): Promise<Chain<U>> {
    const entries = (await this.val.await()).map(
      async (el, index, array) =>
        await this.transformer(await el, index, array),
    )

    return await asyncChain(entries).await()
  }
}

class PermutationsAsyncChain<T> extends AsyncChain<ReadonlyArray<T>> {
  constructor(private val: AsyncChain<T>) {
    super()
  }

  async calculate(): Promise<Chain<ReadonlyArray<T>>> {
    return (await this.val.await()).permutations()
  }
}

class ReversingAsyncChain<T> extends AsyncChain<T> {
  constructor(private val: AsyncChain<T>) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).reverse()
  }
}

class RunningReduceAsyncChain<T, O> extends AsyncChain<O> {
  constructor(
    private val: AsyncChain<T>,
    private reducer: (accumulator: O, current: T) => Promise<O> | O,
    private initialValue: O,
  ) {
    super()
  }

  async calculate(): Promise<Chain<O>> {
    const values = await this.val.value()
    const ret: Array<O> = []
    let acc = this.initialValue
    for (const it of values) {
      acc = await this.reducer(acc, it)
      ret.push(acc)
    }

    return chain(ret)
  }
}

class SliceAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private start?: number,
    private end?: number,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).slice(this.start, this.end)
  }
}

class SlidingWindowAsyncChain<T> extends AsyncChain<ReadonlyArray<T>> {
  constructor(
    private val: AsyncChain<T>,
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

class SortByAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
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
  }

  async calculate(): Promise<Chain<T>> {
    const values = await this.val
      .map(async (el) => [el, await this.selector(el)] as const)
      .await()
    return values.sortBy((it) => it[1]).map((it) => it[0])
  }
}

class SortingAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private compareFn?: (a: T, b: T) => number,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).sort(this.compareFn)
  }
}

class TakeWhileAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
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

class TakeLastWhileAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    const values = await this.val.value()
    const ret: Array<T> = []
    for (let i = values.length - 1; i >= 0; i--) {
      if (await this.predicate(values[i], i, values)) {
        ret.push(values[i])
      } else {
        break
      }
    }

    return new Chain(ret.reverse())
  }
}

class UnionAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private withArrays: ReadonlyArray<Iterable<T> | AsyncChain<T>>,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    const other = await Promise.all(this.withArrays.map(toArray))

    return (await this.val.await()).union(...other)
  }
}

class ValuesAsyncChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends AsyncChain<T> {
  constructor(private val: AsyncObjectChain<K, T, Rec>) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).values()
  }
}

class ZippingAsyncChain<T, U> extends AsyncChain<[T, U]> {
  constructor(
    private val: AsyncChain<T>,
    private withArray: Iterable<U> | AsyncChain<U>,
  ) {
    super()
  }

  async calculate(): Promise<Chain<[T, U]>> {
    return (await this.val.await()).zip(await toArray(this.withArray))
  }
}

class WithoutAllAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private without: Iterable<T> | AsyncChain<T>,
  ) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).withoutAll(await toArray(this.without))
  }
}

// *********************
//  Async Object
// *********************
export abstract class AsyncObjectChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> implements Promise<ObjectChain<K, T, Rec>>
{
  private _value: Promise<ObjectChain<K, T, Rec>> | null

  protected startCalculation() {
    this._value = this._value ?? this.calculate()
  }

  [Symbol.toStringTag] = "AsyncObjectChain"

  constructor() {
    this._value = null
  }

  abstract calculate(): Promise<ObjectChain<K, T, Rec>>

  async await(): Promise<ObjectChain<K, T, Rec>> {
    void this.startCalculation()
    return (await this._value) ?? error("No promise after starting calculation")
  }

  async value(): Promise<Rec> {
    return (await this.await()).value()
  }

  async then<TResult1 = ObjectChain<K, T, Rec>, TResult2 = never>(
    onfulfilled?:
      | ((value: ObjectChain<K, T, Rec>) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): Promise<TResult1 | TResult2> {
    return await this.await().then(onfulfilled, onrejected)
  }

  async catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined,
  ): Promise<ObjectChain<K, T, Rec> | TResult> {
    return this.then((it) => it, onrejected)
  }

  finally(
    onfinally?: (() => void) | null | undefined,
  ): Promise<ObjectChain<K, T, Rec>> {
    return this.await().finally(onfinally)
  }

  keys(): AsyncChain<K> {
    return new KeysAsyncChain(this)
  }

  values(): AsyncChain<T> {
    return new ValuesAsyncChain(this)
  }

  entries(): AsyncChain<[K, T]> {
    return new EntriesAsyncChain(this)
  }

  mapKeys<U extends string | number | symbol>(
    transformer: (key: K) => Promise<U> | U,
  ): AsyncObjectChain<U, T> {
    return new MappingEntriesAsyncObjectChain<K, T, U, T, Rec>(
      this,
      async (k, v) => [await transformer(k), v],
    )
  }

  mapValues<V>(
    transformer: (value: T) => Promise<V> | V,
  ): AsyncObjectChain<K, V> {
    return new MappingEntriesAsyncObjectChain<K, T, K, V, Rec>(
      this,
      async (k, v) => [k, await transformer(v)],
    )
  }

  mapEntries<U extends string | number | symbol, V>(
    transformer: (key: K, value: T) => Promise<[U, V]> | [U, V],
  ): AsyncObjectChain<U, V> {
    return new MappingEntriesAsyncObjectChain<K, T, U, V, Rec>(
      this,
      transformer,
    )
  }

  filterKeys(
    filter: (key: K) => Promise<boolean> | boolean,
  ): AsyncObjectChain<K, T> {
    return new FilteringAsyncObjectChain(this, (k, _) => filter(k))
  }

  filterValues(
    filter: (value: T) => Promise<boolean> | boolean,
  ): AsyncObjectChain<K, T> {
    return new FilteringAsyncObjectChain(this, (_, v) => filter(v))
  }

  filterEntries(
    filter: (key: K, value: T) => Promise<boolean> | boolean,
  ): AsyncObjectChain<K, T> {
    return new FilteringAsyncObjectChain(this, filter)
  }
}

class MappingEntriesAsyncObjectChain<
  K extends string | number | symbol,
  T,
  U extends string | number | symbol,
  V,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends AsyncObjectChain<U, V> {
  constructor(
    private val: AsyncObjectChain<K, T, Rec>,
    private transformer: (key: K, value: T) => [U, V] | Promise<[U, V]>,
  ) {
    super()
  }

  async calculate(): Promise<ObjectChain<U, V>> {
    const values = await this.val
      .entries()
      .map(async ([k, v]) => await this.transformer(k, v))

    return objChain(values)
  }
}

class AssociatingAsyncObjectChain<
  K extends string | number | symbol,
  T,
> extends AsyncObjectChain<K, T> {
  constructor(
    private val: AsyncChain<T>,
    private selector: (elem: T) => K | Promise<K>,
  ) {
    super()
  }

  async calculate(): Promise<ObjectChain<K, T>> {
    const entries = await this.val.map(
      async (it) => [await this.selector(it), it] as const,
    )

    return objChain(entries)
  }
}

class GroupingAsyncObjectChain<
  K extends string | number | symbol,
  T,
> extends AsyncObjectChain<K, ReadonlyArray<T>> {
  constructor(
    private val: AsyncChain<T>,
    private selector: (elem: T) => K | Promise<K>,
  ) {
    super()
  }

  async calculate(): Promise<ObjectChain<K, ReadonlyArray<T>>> {
    const keyed = await this.val
      .map(async (el) => [await this.selector(el), el] as const)
      .value()
    return groupEntries(keyed)
  }
}

class FilteringAsyncObjectChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends AsyncObjectChain<K, T> {
  constructor(
    private val: AsyncObjectChain<K, T, Rec>,
    private condition: (key: K, value: T) => boolean | Promise<boolean>,
  ) {
    super()
  }

  async calculate(): Promise<ObjectChain<K, T>> {
    const entries = await this.val
      .entries()
      .filter(async ([k, v]) => await this.condition(k, v))

    return objChain(entries)
  }
}

class SimpleAsyncObjectChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends AsyncObjectChain<K, T, Rec> {
  constructor(
    private val:
      | Rec
      | ObjectChain<K, T, Rec>
      | Promise<Rec | ObjectChain<K, T, Rec>>,
  ) {
    super()
  }

  async calculate(): Promise<ObjectChain<K, T, Rec>> {
    const val = await this.val
    if (val instanceof ObjectChain) return val as ObjectChain<K, T, Rec>
    return objChain(val) as unknown as ObjectChain<K, T, Rec>
  }
}
