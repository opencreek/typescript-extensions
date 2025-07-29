import { error } from "../../error"
import {
  Chain,
  IfString,
  objChain,
  ObjectChain,
  PairSplit,
} from "../../collections"
import { TakeWhileAsyncChain } from "./TakeWhileAsyncChain"
import { DropWhileAsyncChain } from "./DropWhileAsyncChain"
import { DistinctAsyncChain } from "./DistinctAsyncChain"
import { SliceAsyncChain } from "./SliceAsyncChain"
import { FilterAsyncChain } from "./FilterAsyncChain"
import { FlattenAsyncChain } from "./FlattenAsyncChain"
import { MappingAsyncChain } from "./MappingAsyncChain"
import { SortByAsyncChain } from "./SortByAsyncChain"
import { ZippingAsyncChain } from "./ZippingAsyncChain"
import { UnionAsyncChain } from "./UnionAsyncChain"
import { RunningReduceAsyncChain } from "./RunningReduceAsyncChain"
import { ConcatenatingAsyncChain } from "./ConcatenatingAsyncChain"
import { ChunkingAsyncChain } from "./ChunkingAsyncChain"
import { IntersectionAsyncChain } from "./IntersectionAsyncChain"
import { SlidingWindowAsyncChain } from "./SlidingWindowAsyncChain"
import { PermutationsAsyncChain } from "./PermutationsAsyncChain"
import { ReversingAsyncChain } from "./ReversingAsyncChain"
import { SortingAsyncChain } from "./SortingAsyncChain"

export abstract class AsyncChainBase<T> implements Promise<Chain<T>> {
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

  async writableValue(): Promise<Array<T>> {
    return (await this.await()).writableValue()
  }

  associateBy<S extends string | number | symbol>(
    selector: (el: T) => S,
  ): ObjectChain<S, T> {
    const entries = this.map((m) => {
      return [selector(m), m] as const
    })
    // TODO(mr)
    // @ts-expect-error
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
    // TODO(mr)
    // @ts-expect-error
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
      // TODO(mr)
      // @ts-expect-error
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
      // TODO(mr)
      // @ts-expect-error
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
    // TODO(mr)
    // @ts-expect-error
    const [left, right] = unzip(this.val as unknown as ReadonlyArray<[T, T]>)
    return [new Chain(left), new Chain(right)] as PairSplit<T>
  }

  withoutAll(values: readonly T[]): Chain<T> {
    // TODO(mr)
    // @ts-expect-error
    const ret = withoutAll(this.val, values)
    return new Chain(ret)
  }

  zip<U>(withArray: readonly U[] | AsyncChainBase<U>): AsyncChainBase<[T, U]> {
    return new ZippingAsyncChain(this, withArray)
  }
}
