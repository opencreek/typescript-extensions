import { AsyncObjectChain } from "./AsyncObjectChain"
import { ObjectChain } from "../../collections"

export class MappingValuesAsyncObjectChain<
  K extends string | number | symbol,
  T,
  U,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends AsyncObjectChain<K, U> {
  constructor(
    private val: AsyncObjectChain<K, T, Rec>,
    private transformer: (key: T) => U | Promise<U>,
  ) {
    super()
  }

  async calculate(): Promise<ObjectChain<K, U>> {
    const values = await this.val
      .entries()
      .map(async ([k, v]) => [k, await this.transformer(v)])
      .value()

    return new ObjectChain(Object.fromEntries(values))
  }
}
