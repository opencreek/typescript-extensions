import test from "ava"
import { sleep } from "./sleep"
import { StopWatch } from "./StopWatch"

test("StopWatch should time tasks and output a nice table", async (t) => {
  const sw = new StopWatch("1")
  await sleep(1000)
  sw.start("2")
  await sleep(1500)
  sw.start("3")
  await sleep(100)
  sw.stop()

  t.is(sw.tasks.length, 3)
  t.true(sw.toString() !== "")
  console.log(sw.toString())
})

test("StopWatch should be able to be started later", async (t) => {
  const sw = new StopWatch()
  sw.start("1")
  await sleep(1000)
  sw.start("2")
  await sleep(1500)
  sw.start("3")
  await sleep(100)
  sw.stop()

  t.is(sw.tasks.length, 3)
  t.true(sw.toString() !== "")
  console.log(sw.toString())
})
