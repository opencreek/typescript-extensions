import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class TakeWhileAsyncChain<T> extends AsyncChainBase<T> {
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
    const values = await this.val.value()
    const ret: Array<T> = []
    for (let i = 0; i < values.length; i++) {
      if (await this.predicate(values[i], i, values)) {
        ret.push(values[i])
      } else {
        break
      }
    }

    return new Chain(ret)
  }
}
