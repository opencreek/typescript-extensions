import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class ConcatenatingAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private other: AsyncChainBase<T> | Iterable<T>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const adding =
      this.other instanceof AsyncChainBase
        ? await this.other.await()
        : this.other
    return (await this.val.await()).concat(adding)
  }
}
