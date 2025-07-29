import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export class SortByAsyncChain<T> extends AsyncChainBase<T> {
  constructor(
    private val: AsyncChainBase<T>,
    private selector: (
      a: T,
    ) =>
      | Promise<Date | bigint | string | number>
      | Date
      | bigint
      | string
      | number,
  ) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    const values = await this.val
      .map(async (el) => [el, await this.selector(el)] as const)
      .await()
    return values.sortBy((it) => it[1]).map((it) => it[0])
  }
}
