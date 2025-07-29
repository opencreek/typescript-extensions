import { AsyncChainBase } from "./AsyncChainBase"
import { slidingWindows } from "@opencreek/deno-std-collections"
import { Chain } from "../../collections"

export class SlidingWindowAsyncChain<T> extends AsyncChainBase<
  ReadonlyArray<T>
> {
  constructor(
    private val: AsyncChainBase<T>,
    private size: number,
    private options: {
      step?: number
      partial?: boolean
    },
  ) {
    super()
  }

  async calculate(): Promise<Chain<ReadonlyArray<T>>> {
    const ret = slidingWindows(await this.val.value(), this.size, this.options)
    return new Chain(ret)
  }
}
