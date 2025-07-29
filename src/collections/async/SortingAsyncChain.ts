import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class SortingAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private compareFn?: (a: T, b: T) => number,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return (await this.val.await()).sort(this.compareFn)
  }
}
