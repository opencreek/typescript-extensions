import { AsyncChainBase } from "./AsyncChainBase"
import { Chain } from "../../collections"

export type ArrayOrAsyncChain<U> =
  | Chain<U>
  | ReadonlyArray<U>
  | AsyncChainBase<U>

export class AsyncChain<T> extends AsyncChainBase<T> {
  constructor(private val: ReadonlyArray<Promise<T> | T>) {
    super()
    this.startCalclulation()
  }

  async calculate(): Promise<Chain<T>> {
    return new Chain(await Promise.all(this.val))
  }
}

export function asyncChain<T>(val: Chain<Promise<T> | T>): AsyncChain<T>
export function asyncChain<T>(val: ReadonlyArray<Promise<T> | T>): AsyncChain<T>
export function asyncChain<T>(
  val: ReadonlyArray<Promise<T> | T> | Chain<Promise<T> | T>,
): AsyncChain<T> {
  if (val instanceof Chain) return new AsyncChain(val.value())
  return new AsyncChain(val)
}
