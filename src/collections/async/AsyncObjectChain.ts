import { AsyncChainBase } from "./AsyncChainBase"
import { ObjectChain } from "../../collections"
import { ValuesAsyncChain } from "./ValuesAsyncChain"
import { KeysAsyncChain } from "./KeysAsyncChain"
import { EntriesAsyncChain } from "./EntriesAsyncChain"
import { MappingKeysAsyncObjectChain } from "./MappingKeysAsyncObjectChain"
import { MappingValuesAsyncObjectChain } from "./MappingValuesAsyncObjectChain"
import { MappingEntriesAsyncObjectChain } from "./MappingEntriesAsyncObjectChain"
import { FilteringAsyncObjectChain } from "./FilteringAsyncObjectChain"

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

  keys(): AsyncChainBase<K> {
    return new KeysAsyncChain(this)
  }

  values(): AsyncChainBase<T> {
    return new ValuesAsyncChain(this)
  }

  entries(): AsyncChainBase<[K, T]> {
    return new EntriesAsyncChain(this)
  }

  mapKeys<U extends string | number | symbol>(
    transformer: (key: K) => Promise<U> | U,
  ): AsyncObjectChain<U, T> {
    return new MappingKeysAsyncObjectChain<K, U, T, Rec>(this, transformer)
  }

  mapValues<V>(
    transformer: (value: T) => Promise<V> | V,
  ): AsyncObjectChain<K, V> {
    return new MappingValuesAsyncObjectChain<K, T, V, Rec>(this, transformer)
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
