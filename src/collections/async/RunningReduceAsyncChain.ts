import { AsyncChainBase } from "./AsyncChainBase"
import { chain, Chain } from "../../collections"

export class RunningReduceAsyncChain<T, O> extends AsyncChainBase<O> {
  constructor(
    private val: AsyncChainBase<T>,
    private reducer: (accumulator: O, current: T) => Promise<O> | O,
    private initialValue: O,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<O>> {
    const ret = await this.val.reduce(
      async (acc, it) => {
        const elem = acc[acc.length - 1]
        const next = await this.reducer(elem, it)
        return [...acc, next]
      },
      [this.initialValue],
    )

    return chain(ret)
  }
}
