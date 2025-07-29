import { AsyncChainBase } from "./AsyncChainBase"
import { intersect } from "@opencreek/deno-std-collections"
import { chain, Chain } from "../../collections"

export class IntersectionAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private withArrays: ReadonlyArray<readonly T[] | AsyncChainBase<T>>,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const others = await Promise.all(
      this.withArrays.map(async (it) =>
        it instanceof AsyncChainBase ? await it.value() : it,
      ),
    )
    const ret = intersect(await this.val.value(), ...others)
    return chain(ret)
  }
}
