import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class PermutationsAsyncChain<T> extends AsyncChainBase<
  ReadonlyArray<T>
> {
  constructor(private val: AsyncChainBase<T>) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<ReadonlyArray<T>>> {
    return (await this.val.await()).permutations()
  }
}
