import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class DistinctAsyncChain<T, D> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private selector: (el: T) => D,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).distinctBy(this.selector)
  }
}
