import { AsyncChainBase } from "./AsyncChainBase"
import { AsyncObjectChain } from "./AsyncObjectChain"
import { Chain } from "../../collections"

export class EntriesAsyncChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends AsyncChainBase<[K, T]> {
  constructor(private val: AsyncObjectChain<K, T, Rec>) {
    super()
  }

  async calculate(): Promise<Chain<[K, T]>> {
    return (await this.val.await()).entries()
  }
}
