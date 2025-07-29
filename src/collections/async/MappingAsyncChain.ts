import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"
import { asyncChain } from "./AsyncChain"

export class MappingAsyncChain<T, U> extends AsyncChainBase<U> {
  constructor(
    private val: AsyncChainBase<T>,
    private transformer: (
      el: T,
      index: number,
      array: ReadonlyArray<T>,
    ) => U | Promise<U>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<U>> {
    const entries = (await this.val.await()).map(
      async (el, index, array) =>
        await this.transformer(await el, index, array),
    )

    return await asyncChain(entries).await()
  }
}
