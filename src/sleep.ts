/**
 * sleep will sleep for the given milliseconds and then resolve the Promise
 * @param ms number of milliseconds to sleep
 */
export async function sleep(ms: number): Promise<void> {
  const p = new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
  return p
}
