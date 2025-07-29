import { AsyncChainBase } from "./AsyncChainBase"
import { AsyncObjectChain } from "./AsyncObjectChain"
import { Chain } from "../../collections"

export class KeysAsyncChain<
  K extends string | number | symbol,
> extends AsyncChainBase<K> {
  constructor(private val: AsyncObjectChain<K, any>) {
    super()
  }

  async calculate(): Promise<Chain<K>> {
    return (await this.val.await()).keys()
  }
}
