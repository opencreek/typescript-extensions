import {
  chain,
  Chain,
  IfString,
  objChain,
  ObjectChain,
  PairSplit,
} from "../collections"
import { error } from "../error"
import { groupEntries } from "./groupEntries"

export type ArrayOrAsyncChain<U> = Chain<U> | ReadonlyArray<U> | AsyncChain<U>

type Callback<T, R> = (
  el: T,
  index: number,
  array: ReadonlyArray<T>,
) => R | Promise<R>

export function asyncChain<T>(val: Iterable<Promise<T> | T>): AsyncChain<T>
export function asyncChain<_T>(val: undefined | null): undefined
export function asyncChain<T>(
  val: Iterable<Promise<T> | T> | undefined | null,
): AsyncChain<T> | undefined
export function asyncChain<T>(
  val: Iterable<Promise<T> | T> | undefined | null,
): AsyncChain<T> | undefined {
  if (val == null) return undefined
  const values = chain(val).value()
  return new AsyncChain(async () => new Chain(await Promise.all(values)))
}

export function asyncObjChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
>(
  val: Rec | ObjectChain<K, T, Rec> | Promise<Rec | ObjectChain<K, T, Rec>>,
): AsyncObjectChain<K, T, Rec> {
  return new AsyncObjectChain(async () => {
    const resolved = await val
    if (resolved instanceof ObjectChain) return resolved
    return objChain(resolved) as unknown as ObjectChain<K, T, Rec>
  })
}

// The only place callbacks are fanned out: all at once, results in input order.
// Each call is wrapped, so a callback that throws synchronously still lets the others run.
function resolveAll<T, R>(
  values: ReadonlyArray<T>,
  fn: Callback<T, R>,
): Promise<Array<R>> {
  return Promise.all(values.map(async (el, i, arr) => fn(el, i, arr)))
}

// Number of leading (or trailing) elements matching the predicate, evaluated one at a time.
async function countWhile<T>(
  values: ReadonlyArray<T>,
  predicate: Callback<T, boolean>,
  fromEnd = false,
): Promise<number> {
  let count = 0
  for (let n = 0; n < values.length; n++) {
    const i = fromEnd ? values.length - 1 - n : n
    if (!(await predicate(values[i], i, values))) break
    count++
  }
  return count
}

async function toArray<U>(
  val: Iterable<U> | AsyncChain<U>,
): Promise<ReadonlyArray<U>> {
  if (val instanceof AsyncChain) return val.value()
  return chain(val).value()
}

/**
 * A lazily computed, memoised promise: `source` runs on the first await (or
 * then/catch/finally/value/...), and every later await shares its result.
 */
abstract class Lazy<V> implements Promise<V> {
  private memo: Promise<V> | undefined

  protected constructor(private readonly source: () => Promise<V>) {}

  abstract readonly [Symbol.toStringTag]: string

  await(): Promise<V> {
    return (this.memo ??= this.source())
  }

  then<TResult1 = V, TResult2 = never>(
    onfulfilled?:
      ((value: V) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?:
      ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Promise<TResult1 | TResult2> {
    return this.await().then(onfulfilled, onrejected)
  }

  catch<TResult = never>(
    onrejected?:
      ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined,
  ): Promise<V | TResult> {
    return this.await().catch(onrejected)
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<V> {
    return this.await().finally(onfinally)
  }
}

export class AsyncChain<T> extends Lazy<Chain<T>> {
  readonly [Symbol.toStringTag] = "AsyncChain"

  /** Prefer `asyncChain(...)` or `chain(...).async()`. */
  constructor(source: () => Promise<Chain<T>>) {
    super(source)
  }

  /** A new lazy chain computed from this chain's resolved value. */
  private derive<U>(
    derive: (val: Chain<T>) => Chain<U> | Promise<Chain<U>>,
  ): AsyncChain<U> {
    return new AsyncChain(async () => derive(await this.await()))
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
    return new AsyncObjectChain(async () =>
      objChain(await this.map(async (el) => [await selector(el), el] as const)),
    )
  }

  associateWith<U>(
    selector: (key: string) => U | Promise<U>,
  ): IfString<T, AsyncObjectChain<string, U>> {
    return this.associateBy((el) => el as unknown as string).mapValues(
      selector as (value: T) => U | Promise<U>,
    ) as IfString<T, AsyncObjectChain<string, U>>
  }

  chunk(size: number): AsyncChain<T[]> {
    return this.derive((it) => it.chunk(size))
  }

  concat(other: Iterable<T> | AsyncChain<T>): AsyncChain<T> {
    return this.derive(async (it) => it.concat(await toArray(other)))
  }

  distinct(): AsyncChain<T> {
    return this.distinctBy((it) => it)
  }

  distinctBy<D>(selector: (el: T) => D | Promise<D>): AsyncChain<T> {
    return this.derive(async (it) => {
      const keys = await resolveAll(it.value(), selector)
      return it
        .map((el, i) => [el, keys[i]] as const)
        .distinctBy(([, key]) => key)
        .map(([el]) => el)
    })
  }

  drop(num: number): AsyncChain<T> {
    return this.derive((it) => it.drop(num))
  }

  dropLast(num: number): AsyncChain<T> {
    return this.derive((it) => it.dropLast(num))
  }

  take(num: number): AsyncChain<T> {
    return this.derive((it) => it.take(num))
  }

  takeLast(num: number): AsyncChain<T> {
    return this.derive((it) => it.takeLast(num))
  }

  dropLastWhile(
    predicate: (el: T) => Promise<boolean> | boolean,
  ): AsyncChain<T> {
    return this.derive(async (it) =>
      it.dropLast(await countWhile(it.value(), predicate, true)),
    )
  }

  dropWhile(predicate: (el: T) => Promise<boolean> | boolean): AsyncChain<T> {
    return this.derive(async (it) =>
      it.drop(await countWhile(it.value(), predicate)),
    )
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
    return this.derive(async (it) => {
      const keep = await resolveAll(it.value(), filter)
      return it.filter((_, i) => keep[i])
    })
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
    return this.derive(
      (it) =>
        it
          .map((el) => (el instanceof Set ? [...(el as Set<unknown>)] : el))
          .flatten() as Chain<FlattenAsyncType<T>>,
    )
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
    return new AsyncObjectChain(async () =>
      groupEntries(
        await this.map(async (el) => [await selector(el), el] as const),
      ),
    )
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
    return this.derive(async (it) =>
      it.intersect(...(await Promise.all(arrays.map(toArray)))),
    )
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
    return this.derive(
      async (it) => new Chain(await resolveAll(it.value(), transformer)),
    )
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
    return this.derive((it) => it.permutations())
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
    return this.derive((it) => it.reverse())
  }

  runningReduce<O>(
    reducer: (accumulator: O, current: T) => O | Promise<O>,
    initialValue: O,
  ): AsyncChain<O> {
    return this.derive(async (it) => {
      const ret: Array<O> = []
      let acc = initialValue
      for (const el of it) {
        acc = await reducer(acc, el)
        ret.push(acc)
      }
      return new Chain(ret)
    })
  }

  async sample(): Promise<T | undefined> {
    return (await this.await()).sample()
  }

  slice(start?: number, end?: number): AsyncChain<T> {
    return this.derive((it) => it.slice(start, end))
  }

  slidingWindows(
    size: number,
    { step, partial }: { step: number; partial: boolean },
  ): AsyncChain<ReadonlyArray<T>> {
    return this.derive((it) => it.slidingWindows(size, { step, partial }))
  }

  sort(compareFn?: (a: T, b: T) => number): AsyncChain<T> {
    return this.derive((it) => it.sort(compareFn))
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
    return this.derive(async (it) => {
      const keys = await resolveAll(it.value(), selector)
      return it
        .map((el, i) => [el, keys[i]] as const)
        .sortBy(([, key]) => key as number)
        .map(([el]) => el)
    })
  }

  async sumOf(selector: (el: T) => Promise<number> | number): Promise<number> {
    return (await this.map(selector).await()).sumOf((it) => it)
  }

  takeLastWhile(
    predicate: (el: T) => Promise<boolean> | boolean,
  ): AsyncChain<T> {
    return this.derive(async (it) =>
      it.takeLast(await countWhile(it.value(), predicate, true)),
    )
  }

  takeWhile(predicate: (el: T) => Promise<boolean> | boolean): AsyncChain<T> {
    return this.derive(async (it) =>
      it.take(await countWhile(it.value(), predicate)),
    )
  }

  union(...arrays: Array<Iterable<T> | AsyncChain<T>>): AsyncChain<T> {
    return new AsyncChain(async () => {
      const others = await Promise.all(arrays.map(toArray))
      return (await this.await()).union(...others)
    })
  }

  async unzip(): Promise<PairSplit<T>> {
    return (await this.await()).unzip()
  }

  withoutAll(values: Iterable<T> | AsyncChain<T>): AsyncChain<T> {
    return this.derive(async (it) => it.withoutAll(await toArray(values)))
  }

  zip<U>(withArray: Iterable<U> | AsyncChain<U>): AsyncChain<[T, U]> {
    return this.derive(async (it) => it.zip(await toArray(withArray)))
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

// *********************
//  Async Object
// *********************
export class AsyncObjectChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends Lazy<ObjectChain<K, T, Rec>> {
  readonly [Symbol.toStringTag] = "AsyncObjectChain"

  /** Prefer `asyncObjChain(...)`. */
  constructor(source: () => Promise<ObjectChain<K, T, Rec>>) {
    super(source)
  }

  async value(): Promise<Rec> {
    return (await this.await()).value()
  }

  private mapEntriesTo<U extends string | number | symbol, V>(
    transformer: (key: K, value: T) => [U, V] | Promise<[U, V]>,
  ): AsyncObjectChain<U, V> {
    return new AsyncObjectChain(async () =>
      objChain(
        await this.entries().map(async ([k, v]) => await transformer(k, v)),
      ),
    )
  }

  private filterEntriesBy(
    condition: (key: K, value: T) => boolean | Promise<boolean>,
  ): AsyncObjectChain<K, T> {
    return new AsyncObjectChain(async () =>
      objChain(
        await this.entries().filter(async ([k, v]) => await condition(k, v)),
      ),
    )
  }

  keys(): AsyncChain<K> {
    return new AsyncChain(async () => (await this.await()).keys())
  }

  values(): AsyncChain<T> {
    return new AsyncChain(async () => (await this.await()).values())
  }

  entries(): AsyncChain<[K, T]> {
    return new AsyncChain(async () => (await this.await()).entries())
  }

  mapKeys<U extends string | number | symbol>(
    transformer: (key: K) => Promise<U> | U,
  ): AsyncObjectChain<U, T> {
    return this.mapEntriesTo(async (k, v) => [await transformer(k), v])
  }

  mapValues<V>(
    transformer: (value: T) => Promise<V> | V,
  ): AsyncObjectChain<K, V> {
    return this.mapEntriesTo(async (k, v) => [k, await transformer(v)])
  }

  mapEntries<U extends string | number | symbol, V>(
    transformer: (key: K, value: T) => Promise<[U, V]> | [U, V],
  ): AsyncObjectChain<U, V> {
    return this.mapEntriesTo(transformer)
  }

  filterKeys(
    filter: (key: K) => Promise<boolean> | boolean,
  ): AsyncObjectChain<K, T> {
    return this.filterEntriesBy((k) => filter(k))
  }

  filterValues(
    filter: (value: T) => Promise<boolean> | boolean,
  ): AsyncObjectChain<K, T> {
    return this.filterEntriesBy((_, v) => filter(v))
  }

  filterEntries(
    filter: (key: K, value: T) => Promise<boolean> | boolean,
  ): AsyncObjectChain<K, T> {
    return this.filterEntriesBy(filter)
  }
}
