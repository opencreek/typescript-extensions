import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class SliceAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private start?: number,
    private end?: number,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).slice(this.start, this.end)
  }
}
