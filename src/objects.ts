import { extendProtoype } from "./extendPrototype"

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
  }
}
