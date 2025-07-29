import { AsyncChainBase } from "./AsyncChainBase"
import { AsyncObjectChain } from "./AsyncObjectChain"
import { Chain } from "../../collections"

export class ValuesAsyncChain<
  K extends string | number | symbol,
  T,
  Rec extends Partial<Record<K, T>> = Record<K, T>,
> extends AsyncChainBase<T> {
  constructor(private val: AsyncObjectChain<K, T, Rec>) {
    super()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).values()
  }
}
