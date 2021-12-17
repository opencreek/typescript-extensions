/* eslint-disable @typescript-eslint/ban-types */
export function extendProtoype(
  target: Function,
  func: Function,
  functionName: string
): void {
  if (!Object.getOwnPropertyNames(target.prototype).includes(functionName)) {
    Object.defineProperty(target.prototype, functionName, {
      value: func,
      writable: true,
    })
  }
}

export function extendPrototypeWithName<T extends Record<string, Function>>(
    target: Function,
    wrap: T
): void {
    const keys = Object.keys(wrap)
    if (keys.length !== 1) {
        throw Error("You must give extendPrototypeWithName an object with one key")
    }
    const name = keys[0]

    extendProtoype(target, wrap[name], name)
}

type ThisFunction<F extends (...args: any) => any> = (
  this: FirstParameter<F>,
  ...args: SkipFirstParameter<F>
) => ReturnType<F>

type FirstParameter<F extends (...args: any) => any> = Parameters<F> extends [
  infer T,
  ...infer _
]
  ? T
  : never

type SkipFirst<T extends unknown[]> = T extends [infer _, ...infer R]
  ? [...R]
  : never

type SkipFirstParameter<F extends (...args: any) => any> = SkipFirst<
  Parameters<F>
>

export function apply<F extends (...args: any) => any>(f: F): ThisFunction<F> {
  return function (this: FirstParameter<F>, ...b: SkipFirstParameter<F>) {
    return f(this, ...b)
  }
}
