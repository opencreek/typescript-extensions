import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class UnionAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private withArrays: ReadonlyArray<readonly T[] | AsyncChainBase<T>>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const other = await Promise.all(
      this.withArrays.map(async (it) =>
        it instanceof AsyncChainBase ? await it.value() : it,
      ),
    )

    return (await this.val.await()).union(...other)
  }
}
