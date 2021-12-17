import * as collections from "@opencreek/deno-std-collections"
import { extendPrototypeWithName } from "."
import { apply, extendProtoype } from "./extendPrototype"

type Collections = typeof collections

function filterNotNullish<T>(this: Array<T>): Array<NonNullable<T>> {
  return this.filter((it): it is NonNullable<T> => it != null)
}

async function mapAsync<T, U>(
  this: Array<T>,
  f: (e: T, index: number, array: Array<T>) => Promise<U>
): Promise<Array<U>> {
  return Promise.all(this.map(f))
}

async function filterAsync<T>(
  this: Array<T>,
  f: (e: T, index: number, array: Array<T>) => Promise<boolean>
): Promise<Array<T>> {
  const includes = await this.mapAsync(f)

  return this.filter((_, index) => includes[index])
}

function extendArray<
  KEY extends {
    [P in keyof Collections]: Collections[P] extends (
      first: any[],
      ...args: any
    ) => any
      ? P
      : never
  }[keyof Collections]
>(key: KEY): void {
  extendProtoype(Array, apply(collections[key]), key)
}

extendPrototypeWithName(Array, { filterNotNullish })
extendPrototypeWithName(Array, { filterAsync })
extendPrototypeWithName(Array, { mapAsync })

extendArray("associateBy")
extendArray("associateWith")
extendArray("chunk")
extendArray("distinct")
extendArray("distinctBy")
extendArray("dropLastWhile")
extendArray("dropWhile")
extendArray("findLast")
extendArray("findLastIndex")
extendArray("findSingle")
extendArray("firstNotNullishOf")
extendArray("groupBy")
extendArray("intersect")
extendArray("mapNotNullish")
extendArray("maxBy")
extendArray("maxOf")
extendArray("maxWith")
extendArray("minBy")
extendArray("minOf")
extendArray("minWith")
extendArray("partition")
extendArray("permutations")
extendArray("runningReduce")
extendArray("sample")
extendArray("slidingWindows")
extendArray("sortBy")
extendArray("sumOf")
extendArray("takeLastWhile")
extendArray("takeWhile")
extendArray("takeWhile")
extendArray("union")
extendArray("unzip")
extendArray("withoutAll")
extendArray("zip")

type PairSplit<T> = T extends [infer F, infer L] ? [F[], L[]] : never

type StringArrayRecord<T, U> = T extends string ? Record<string, U> : never

declare global {
  interface Array<T> {
    associateBy(selector: (el: T) => string): Record<string, T>
    associateWith<U>(selector: (key: string) => U): StringArrayRecord<T, U>
    chunk(size: number): T[][]
    distinct(): T[]
    distinctBy<D>(selector: (el: T) => D): T[]
    dropLastWhile(predicate: (el: T) => boolean): T[]
    dropWhile(predicate: (el: T) => boolean): T[]
    filterAsync(
      predicate: (el: T, index: number, array: Array<T>) => Promise<boolean>
    ): Promise<Array<T>>
    filterNotNullish(): Array<NonNullable<T>>
    findLast(predicate: (el: T) => boolean): T | undefined
    findLastIndex(predicate: (el: T) => boolean): number | undefined
    findSingle(predicate: (el: T) => boolean): T | undefined
    firstNotNullishOf<O>(
      selector: (item: T) => O | undefined | null
    ): NonNullable<O> | undefined
    groupBy<Key extends string>(selector: (el: T) => Key): Record<Key, T[]>
    intersect(...arrays: (readonly T[])[]): T[]
    mapAsync<U>(
      transformer: (el: T, index: number, array: Array<T>) => Promise<U>
    ): Promise<Array<U>>
    mapNotNullish<O>(transformer: (el: T) => O): NonNullable<O>[]
    maxBy(selector: (el: T) => string): T | undefined
    maxBy(selector: (el: T) => bigint): T | undefined
    maxBy(selector: (el: T) => number): T | undefined
    maxBy(selector: (el: T) => Date): T | undefined
    maxOf(selector: (el: T) => bigint): bigint | undefined
    maxOf(selector: (el: T) => number): number | undefined
    maxOf(selector: (el: T) => string): string | undefined
    maxOf(selector: (el: T) => Date): Date | undefined
    maxWith(comparator: (a: T, b: T) => number): T | undefined
    minBy(selector: (el: T) => number): T | undefined
    minBy(selector: (el: T) => string): T | undefined
    minBy(selector: (el: T) => bigint): T | undefined
    minBy(selector: (el: T) => Date): T | undefined
    minOf(selector: (el: T) => bigint): bigint | undefined
    minOf(selector: (el: T) => number): number | undefined
    minOf(selector: (el: T) => string): string | undefined
    minOf(selector: (el: T) => Date): Date | undefined
    minWith(comparator: (a: T, b: T) => number): T | undefined
    partition(predicate: (el: T) => boolean): [T[], T[]]
    permutations(): T[][]
    runningReduce<O>(
      reducer: (accumulator: O, current: T) => O,
      initialValue: O
    ): O[]
    sample(): T | undefined
    slidingWindows(
      size: number,
      { step, partial }: { step: number; partial: boolean }
    ): T[][]
    sortBy(selector: (el: T) => Date): T[]
    sortBy(selector: (el: T) => bigint): T[]
    sortBy(selector: (el: T) => string): T[]
    sortBy(selector: (el: T) => number): T[]
    sumOf(selector: (el: T) => number): number
    takeLastWhile(predicate: (el: T) => boolean): T[]
    takeWhile(predicate: (el: T) => boolean): T[]
    union(...arrays: (readonly T[])[]): T[]
    unzip(): PairSplit<T>
    withoutAll(values: readonly T[]): T[]
    zip<U>(withArray: readonly U[]): [T, U][]
  }
  interface ReadonlyArray<T> {
    associateBy(selector: (el: T) => string): Record<string, T>
    associateWith<U>(selector: (key: string) => U): StringArrayRecord<T, U>
    chunk(size: number): T[][]
    distinct(): T[]
    distinctBy<D>(selector: (el: T) => D): T[]
    dropLastWhile(predicate: (el: T) => boolean): T[]
    dropWhile(predicate: (el: T) => boolean): T[]
    filterAsync(
      predicate: (el: T, index: number, array: Array<T>) => Promise<boolean>
    ): Promise<Array<T>>
    filterNotNullish(): Array<NonNullable<T>>
    findLast(predicate: (el: T) => boolean): T | undefined
    findLastIndex(predicate: (el: T) => boolean): number | undefined
    findSingle(predicate: (el: T) => boolean): T | undefined
    firstNotNullishOf<O>(
      selector: (item: T) => O | undefined | null
    ): NonNullable<O> | undefined
    groupBy<Key extends string>(selector: (el: T) => Key): Record<Key, T[]>
    intersect(...arrays: (readonly T[])[]): T[]
    mapAsync<U>(
      transformer: (el: T, index: number, array: Array<T>) => Promise<U>
    ): Promise<Array<U>>
    mapNotNullish<O>(transformer: (el: T) => O): NonNullable<O>[]
    maxBy(selector: (el: T) => string): T | undefined
    maxBy(selector: (el: T) => bigint): T | undefined
    maxBy(selector: (el: T) => number): T | undefined
    maxBy(selector: (el: T) => Date): T | undefined
    maxOf(selector: (el: T) => bigint): bigint | undefined
    maxOf(selector: (el: T) => number): number | undefined
    maxOf(selector: (el: T) => string): string | undefined
    maxOf(selector: (el: T) => Date): Date | undefined
    maxWith(comparator: (a: T, b: T) => number): T | undefined
    minBy(selector: (el: T) => number): T | undefined
    minBy(selector: (el: T) => string): T | undefined
    minBy(selector: (el: T) => bigint): T | undefined
    minBy(selector: (el: T) => Date): T | undefined
    minOf(selector: (el: T) => bigint): bigint | undefined
    minOf(selector: (el: T) => number): number | undefined
    minOf(selector: (el: T) => string): string | undefined
    minOf(selector: (el: T) => Date): Date | undefined
    minWith(comparator: (a: T, b: T) => number): T | undefined
    partition(predicate: (el: T) => boolean): [T[], T[]]
    permutations(): T[][]
    runningReduce<O>(
      reducer: (accumulator: O, current: T) => O,
      initialValue: O
    ): O[]
    sample(): T | undefined
    slidingWindows(
      size: number,
      { step, partial }: { step: number; partial: boolean }
    ): T[][]
    sortBy(selector: (el: T) => Date): T[]
    sortBy(selector: (el: T) => bigint): T[]
    sortBy(selector: (el: T) => string): T[]
    sortBy(selector: (el: T) => number): T[]
    sumOf(selector: (el: T) => number): number
    takeLastWhile(predicate: (el: T) => boolean): T[]
    takeWhile(predicate: (el: T) => boolean): T[]
    union(...arrays: (readonly T[])[]): T[]
    unzip(): PairSplit<T>
    withoutAll(values: readonly T[]): T[]
    zip<U>(withArray: readonly U[]): [T, U][]
  }
}
