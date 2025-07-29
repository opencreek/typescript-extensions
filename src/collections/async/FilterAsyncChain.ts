import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"
import { asyncChain } from "./AsyncChain"

export class FilterAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private predicate: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => Promise<boolean> | boolean,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const current = await this.val.await()
    const mask = await asyncChain(current).map(this.predicate).value()

    return current.filter((_, index) => mask[index])
  }
}
