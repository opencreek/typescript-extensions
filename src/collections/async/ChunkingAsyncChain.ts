import { AsyncChainBase } from "./AsyncChainBase"
import { chunk } from "@opencreek/deno-std-collections"
import { AsyncChain } from "./AsyncChain"
import { Chain } from "../../collections"

export class ChunkingAsyncChain<T> extends AsyncChainBase<T[]> {
  constructor(
    private val: AsyncChainBase<T>,
    private size: number,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T[]>> {
    const chunks = chunk(await this.val.value(), this.size)
    return new AsyncChain(chunks)
  }
}
