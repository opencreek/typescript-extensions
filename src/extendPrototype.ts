/* eslint-disable @typescript-eslint/ban-types */
export default function extendProtoype(
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
