import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class ZippingAsyncChain<T, U> extends AsyncChainBase<[T, U]> {
  constructor(
    private val: AsyncChainBase<T>,
    private withArray: readonly U[] | AsyncChainBase<U>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<[T, U]>> {
    const other =
      this.withArray instanceof AsyncChainBase
        ? await this.withArray.value()
        : this.withArray
    return (await this.val.await()).zip(other)
  }
}
