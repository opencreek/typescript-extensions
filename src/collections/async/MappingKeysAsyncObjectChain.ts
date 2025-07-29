import { AsyncObjectChain } from "./AsyncObjectChain"
import { ObjectChain } from "../../collections"

export class MappingKeysAsyncObjectChain<
  K extends string | number | symbol,
  U extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends AsyncObjectChain<U, T> {
  constructor(
    private val: AsyncObjectChain<K, T, Rec>,
    private transformer: (key: K) => U | Promise<U>,
  ) {
    super()
  }

  async calculate(): Promise<ObjectChain<U, T>> {
    const values = await this.val
      .entries()
      .map(async ([k, v]) => [await this.transformer(k), v])
      .value()

    return new ObjectChain(Object.fromEntries(values))
  }
}
