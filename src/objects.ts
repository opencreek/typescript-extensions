import { mapValues } from "@opencreek/deno-std-collections"
import { apply, extendProtoype } from "./extendPrototype"

function mapThis<T, V>(
  this: NonNullable<T>,
  body: (thiz: NonNullable<T>) => V
): V {
  return body(this)
}

function takeIf<T>(
  this: NonNullable<T>,
  predicate: (thiz: NonNullable<T>) => boolean
): T | undefined {
  if (predicate(this)) return this
  return undefined
}

function takeUnless<T>(
  this: NonNullable<T>,
  predicate: (thiz: NonNullable<T>) => boolean
): T | undefined {
  if (predicate(this)) return undefined
  return this
}

extendProtoype(Object, takeIf, "takeIf")
extendProtoype(Object, takeUnless, "takeUnless")
extendProtoype(Object, mapThis, "mapThis")
extendProtoype(Object, apply(mapValues), "mapValues")

declare global {
  interface Object {
    mapThis<T, V>(this: NonNullable<T>, body: (thiz: NonNullable<T>) => V): V

    takeIf<T>(
      this: NonNullable<T>,
      predicate: (thiz: NonNullable<T>) => boolean
    ): T | undefined

    takeUnless<T>(
      this: NonNullable<T>,
      predicate: (thiz: NonNullable<T>) => boolean
    ): T | undefined

    mapValues<T, Key extends keyof T, O>(
      this: Readonly<Record<Key, T>>,
      transformer: (value: T) => O
    ): Record<Key, O>
  }
}
