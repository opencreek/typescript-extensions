import { tableToString } from "./table"

type Task = {
  name: string

  start: number
  elapsed?: number
}

export class StopWatch {
  tasks: Array<Task> = []

  constructor(task?: string) {
    if (task != null) {
      this.tasks.push({
        name: task,
        start: new Date().valueOf(),
      })
    }
  }

  start(task: string): void {
    const latestTask = this.tasks[this.tasks.length - 1]
    if (latestTask?.elapsed === undefined) {
      this.stop()
    }

    this.tasks.push({
      name: task,
      start: new Date().valueOf(),
    })
  }

  stop(): void {
    const latestTask = this.tasks[this.tasks.length - 1]
    if (latestTask?.elapsed === undefined) {
      latestTask.elapsed = new Date().valueOf() - latestTask.start
    }
  }

  toString(): string {
    return tableToString(
      this.tasks
        .filter((it) => it.elapsed !== undefined)
        .map((it) => {
          return {
            name: it.name,
            elapsed: it.elapsed + "ms",
          }
        }),
      ["name", "elapsed"]
    )
  }
}
