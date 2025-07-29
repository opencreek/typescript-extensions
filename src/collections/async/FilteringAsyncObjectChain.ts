import { AsyncObjectChain } from "./AsyncObjectChain"
import { objChain, ObjectChain } from "../../collections"

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
