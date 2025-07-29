import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"
import { ArrayOrAsyncChain } from "./AsyncChain"

type Distribute<U> = U extends any ? { type: U } : never

type FlattenAsyncType<T> = Distribute<T> extends {
  type: ArrayOrAsyncChain<infer U>
}
  ? U
  : T

export class FlattenAsyncChain<T> extends AsyncChainBase<FlattenAsyncType<T>> {
  constructor(private val: AsyncChainBase<T>) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<FlattenAsyncType<T>>> {
    return (await this.val.await()).flatten() as Chain<FlattenAsyncType<T>>
  }
}
