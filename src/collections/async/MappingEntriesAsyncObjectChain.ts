import { AsyncObjectChain } from "./AsyncObjectChain"
import { ObjectChain } from "../../collections"

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
      .value()

    return new ObjectChain<U, V, Record<U, V>>(
      Object.fromEntries(values) as Record<U, V>,
    )
  }
}
