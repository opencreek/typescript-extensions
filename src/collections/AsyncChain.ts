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

export type ArrayOrAsyncChain<U> = Chain<U> | ReadonlyArray<U> | AsyncChain<U>

export function asyncChain<T>(val: Chain<Promise<T> | T>): AsyncChain<T>
export function asyncChain<T>(val: ReadonlyArray<Promise<T> | T>): AsyncChain<T>
export function asyncChain<T>(
  val: ReadonlyArray<Promise<T> | T> | Chain<Promise<T> | T>,
): AsyncChain<T> {
  if (val instanceof Chain) return new SimpleAsyncChain(val.value())
  return new SimpleAsyncChain(val)
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
    return this.then(
      (it) => it,
      (it) => it,
    ).finally(onfinally)
  }

  abstract calculate(): Promise<Chain<T>>

  async await(): Promise<Chain<T>> {
    void this.startCalculation()
    return (
      (await this._value) ?? error("No promise after starting calculation")
    )
  }

  async value(): Promise<ReadonlyArray<T>> {
    return (await this.await()).value()
  }

  async writableValue(): Promise<Array<T>> {
    return (await this.await()).writableValue()
  }

  associateBy<S extends string | number | symbol>(
    selector: (el: T) => S | Promise<S>,
  ): AsyncObjectChain<S, T> {
    return new AssociatingAsyncObjectChain(this, selector)
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

  chunk(size: number): AsyncChain<T[]> {
    return new ChunkingAsyncChain(this, size)
  }

  concat(other: Iterable<T> | AsyncChain<T>): AsyncChain<T> {
    return new ConcatenatingAsyncChain(this, other)
  }

  distinct(): AsyncChain<T> {
    return this.distinctBy((it) => it)
  }

  distinctBy<D>(selector: (el: T) => D): AsyncChain<T> {
    return new DistinctAsyncChain(this, selector)
  }

  drop(num: number): AsyncChain<T> {
    return new SliceAsyncChain(this, num)
  }

  dropLast(num: number): AsyncChain<T> {
    return new SliceAsyncChain(this, 0, -num)
  }

  take(num: number): AsyncChain<T> {
    return new SliceAsyncChain(this, 0, num)
  }

  takeLast(num: number): AsyncChain<T> {
    return new SliceAsyncChain(this, -num)
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
    predicate: (el: T) => Promise<boolean> | boolean,
  ): Promise<T | undefined> {
    const index = await this.findLastIndex(predicate)
    if (index == undefined) return undefined
    return (await this.value())[index]
  }

  async findLastIndex(
    predicate: (el: T) => Promise<boolean> | boolean,
  ): Promise<number | undefined> {
    const val = await this.value()
    for (let i = val.length - 1; i >= 0; i--) {
      if (await predicate(val[i])) {
        return i
      }
    }
    return undefined
  }

  async findSingle(
    predicate: (el: T) => Promise<boolean> | boolean,
  ): Promise<T | undefined> {
    const first = await this.findIndex(predicate)
    if (first == undefined) return undefined

    const last = await this.findLastIndex(predicate)

    if (first != last) return undefined

    return (await this.value())[last]
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
    ) => Promise<ReadonlyArray<U>> | ReadonlyArray<U>,
  ): FlattenAsyncChain<U>
  flatMap<U>(
    transformer: (el: T, index: number, array: ReadonlyArray<T>) => Set<U>,
  ): FlattenAsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => AsyncChain<U>,
  ): FlattenAsyncChain<U>
  flatMap<U>(
    transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Chain<U> | ReadonlyArray<U> | Set<U> | AsyncChain<U>,
  ): FlattenAsyncChain<U>
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

  intersect(...arrays: Array<ReadonlyArray<T> | AsyncChain<T>>): AsyncChain<T> {
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
    let max: number | string | bigint | Date | undefined
    let ret: T | undefined

    for (const elem of await this.value()) {
      const elemValue = await selector(elem)
      if (max == null || elemValue < max) {
        max = elemValue
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
    return [
      this.filter(predicate),
      this.filter(async (el) => !(await predicate(el))),
    ]
  }

  permutations(): AsyncChain<ReadonlyArray<T>> {
    return new PermutationsAsyncChain(this)
  }

  async reduce(
    reducer: (
      accumulator: AsyncChain<T>,
      current: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => AsyncChain<T>,
  ): Promise<AsyncChain<T>>
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

  reverse(): AsyncChain<T> {
    return new ReversingAsyncChain(this)
  }

  runningReduce<O>(
    reducer: (accumulator: O, current: T) => O,
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

  takeLastWhile(predicate: (el: T) => boolean): AsyncChain<T> {
    return new TakeLastWhileAsyncChain(this, predicate)
  }

  takeWhile(predicate: (el: T) => boolean): AsyncChain<T> {
    return new TakeWhileAsyncChain(this, predicate)
  }

  union(...arrays: (readonly T[] | AsyncChain<T>)[]): AsyncChain<T> {
    return new UnionAsyncChain(this, arrays)
  }

  async unzip(): Promise<PairSplit<T>> {
    return (await this.await()).unzip()
  }

  withoutAll(values: readonly T[] | Chain<T> | AsyncChain<T>): AsyncChain<T> {
    return new WithoutAllAsyncChain(this, values)
  }

  zip<U>(withArray: readonly U[] | AsyncChain<U>): AsyncChain<[T, U]> {
    return new ZippingAsyncChain(this, withArray)
  }
}

export class SimpleAsyncChain<T> extends AsyncChain<T> {
  constructor(private val: ReadonlyArray<Promise<T> | T>) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    return new Chain(await Promise.all(this.val))
  }
}

export class ChunkingAsyncChain<T> extends AsyncChain<T[]> {
  constructor(
    private val: AsyncChain<T>,
    private size: number,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T[]>> {
    const chunks = chunk(await this.val.value(), this.size)
    return new Chain(chunks)
  }
}

export class ConcatenatingAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private other: AsyncChain<T> | Iterable<T>,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    const adding =
      this.other instanceof AsyncChain ? await this.other.await() : this.other
    return (await this.val.await()).concat(adding)
  }
}

export class DistinctAsyncChain<T, D> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private selector: (el: T) => D,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).distinctBy(this.selector)
  }
}

export class DropWhileAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
    this.startCalculation()
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

export class DropLastWhileAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
    this.startCalculation()
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

export class EntriesAsyncChain<
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

export class FilterAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    const current = await this.val.await()
    const mask = await asyncChain(current).map(this.predicate).value()

    return current.filter((_, index) => mask[index])
  }
}

type Distribute<U> = U extends any ? { type: U } : never

type FlattenAsyncType<T> = Distribute<T> extends {
  type: ArrayOrAsyncChain<infer U>
}
  ? U
  : T

export class FlattenAsyncChain<T> extends AsyncChain<FlattenAsyncType<T>> {
  constructor(
    private val:
      | AsyncChain<T>
      | AsyncChain<Chain<T>>
      | AsyncChain<ReadonlyArray<T>>
      | AsyncChain<AsyncChain<T>>,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<FlattenAsyncType<T>>> {
    const flattend = await this.val.map(async (el) =>
      el instanceof AsyncChain
        ? await el.value()
        : el instanceof Chain
        ? el.value()
        : el,
    )

    return flattend.flatten() as Chain<FlattenAsyncType<T>>
  }
}

export class IntersectionAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private withArrays: ReadonlyArray<readonly T[] | AsyncChain<T>>,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    const others = await Promise.all(
      this.withArrays.map(async (it) =>
        it instanceof AsyncChain ? await it.value() : it,
      ),
    )
    const ret = intersect(await this.val.value(), ...others)
    return chain(ret)
  }
}

export class KeysAsyncChain<
  K extends string | number | symbol,
> extends AsyncChain<K> {
  constructor(private val: AsyncObjectChain<K, any>) {
    super()
  }

  async calculate(): Promise<Chain<K>> {
    return (await this.val.await()).keys()
  }
}

export class MappingAsyncChain<T, U> extends AsyncChain<U> {
  constructor(
    private val: AsyncChain<T>,
    private transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => U | Promise<U>,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<U>> {
    const entries = (await this.val.await()).map(
      async (el, index, array) =>
        await this.transformer(await el, index, array),
    )

    return await asyncChain(entries).await()
  }
}

export class PermutationsAsyncChain<T> extends AsyncChain<ReadonlyArray<T>> {
  constructor(private val: AsyncChain<T>) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<ReadonlyArray<T>>> {
    return (await this.val.await()).permutations()
  }
}

export class ReversingAsyncChain<T> extends AsyncChain<T> {
  constructor(private val: AsyncChain<T>) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).reverse()
  }
}

export class RunningReduceAsyncChain<T, O> extends AsyncChain<O> {
  constructor(
    private val: AsyncChain<T>,
    private reducer: (accumulator: O, current: T) => Promise<O> | O,
    private initialValue: O,
  ) {
    super()
    this.startCalculation()
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

export class SliceAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private start?: number,
    private end?: number,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).slice(this.start, this.end)
  }
}

export class SlidingWindowAsyncChain<T> extends AsyncChain<ReadonlyArray<T>> {
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

export class SortByAsyncChain<T> extends AsyncChain<T> {
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
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    const values = await this.val
      .map(async (el) => [el, await this.selector(el)] as const)
      .await()
    return values.sortBy((it) => it[1]).map((it) => it[0])
  }
}

export class SortingAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private compareFn?: (a: T, b: T) => number,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).sort(this.compareFn)
  }
}

export class TakeWhileAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
    this.startCalculation()
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

export class TakeLastWhileAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
    this.startCalculation()
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

export class UnionAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private withArrays: ReadonlyArray<readonly T[] | AsyncChain<T>>,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    const other = await Promise.all(
      this.withArrays.map(async (it) =>
        it instanceof AsyncChain ? await it.value() : it,
      ),
    )

    return (await this.val.await()).union(...other)
  }
}

export class ValuesAsyncChain<
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

export class ZippingAsyncChain<T, U> extends AsyncChain<[T, U]> {
  constructor(
    private val: AsyncChain<T>,
    private withArray: readonly U[] | AsyncChain<U>,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<[T, U]>> {
    const other =
      this.withArray instanceof AsyncChain
        ? await this.withArray.value()
        : this.withArray
    return (await this.val.await()).zip(other)
  }
}

export class WithoutAllAsyncChain<T> extends AsyncChain<T> {
  constructor(
    private val: AsyncChain<T>,
    private without: readonly T[] | AsyncChain<T> | Chain<T>,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<Chain<T>> {
    const other =
      this.without instanceof AsyncChain
        ? await this.without.value()
        : this.without instanceof Chain
        ? this.without.value()
        : this.without
    return (await this.val.await()).withoutAll(other)
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
    this._value = this.calculate()
  }

  [Symbol.toStringTag] = "AsyncObjectChain"

  constructor() {
    this._value = null
  }

  abstract calculate(): Promise<ObjectChain<K, T, Rec>>

  async await(): Promise<ObjectChain<K, T, Rec>> {
    return (await this._value) ?? (await this.calculate())
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
    return await this.calculate().then(onfulfilled, onrejected)
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
    return this.then(
      (it) => it,
      (it) => it,
    ).finally(onfinally)
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

  filterKeys(filter: (key: K) => boolean): AsyncObjectChain<K, T> {
    return new FilteringAsyncObjectChain(this, (k, _) => filter(k))
  }

  filterValues(filter: (value: T) => boolean): AsyncObjectChain<K, T> {
    return new FilteringAsyncObjectChain(this, (_, v) => filter(v))
  }

  filterEntries(filter: (key: K, value: T) => boolean): AsyncObjectChain<K, T> {
    return new FilteringAsyncObjectChain(this, filter)
  }
}

export class MappingEntriesAsyncObjectChain<
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

export class AssociatingAsyncObjectChain<
  K extends string | number | symbol,
  T,
> extends AsyncObjectChain<K, T> {
  constructor(
    private val: AsyncChain<T>,
    private selector: (elem: T) => K | Promise<K>,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<ObjectChain<K, T>> {
    const entries = await this.val.map(
      async (it) => [await this.selector(it), it] as const,
    )

    return objChain(entries)
  }
}

export class GroupingAsyncObjectChain<
  K extends string | number | symbol,
  T,
> extends AsyncObjectChain<K, ReadonlyArray<T>> {
  constructor(
    private val: AsyncChain<T>,
    private selector: (elem: T) => K | Promise<K>,
  ) {
    super()
    this.startCalculation()
  }

  async calculate(): Promise<ObjectChain<K, ReadonlyArray<T>>> {
    const entries = await this.val
      .map(async (it) => [await this.selector(it), it] as const)
      .value()
    const record = {} as Record<K, Array<T>>
    for (const [key, el] of entries) {
      if (record[key] != null) {
        record[key]?.push(el)
      } else {
        record[key] = [el]
      }
    }

    return objChain(record)
  }
}

export class FilteringAsyncObjectChain<
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
