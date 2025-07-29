import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class ReversingAsyncChain<T> extends AsyncChainBase<T> {
  constructor(private val: AsyncChainBase<T>) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).reverse()
  }
}
