import { tableToString } from "./table"
import { chain } from "./collections"

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
    if (latestTask != null && latestTask?.elapsed == null) {
      this.stop()
    }

    this.tasks.push({
      name: task,
      start: new Date().valueOf(),
    })
  }

  stop(): void {
    const latestTask = this.tasks[this.tasks.length - 1]
    if (latestTask != null && latestTask?.elapsed == null) {
      latestTask.elapsed = new Date().valueOf() - latestTask.start
    }
  }

  getTotalElapsedTimeInMs(): number {
    return chain(this.tasks).sumOf((it) => it.elapsed ?? 0)
  }

  toString(): string {
    const table = [
      ...this.tasks
        .filter((it) => it.elapsed !== undefined)
        .map((it) => {
          return {
            name: it.name,
            elapsed: it.elapsed + "ms",
          }
        }),
      {
        name: "Total",
        elapsed: this.getTotalElapsedTimeInMs() + "ms",
      },
    ]
    return tableToString(table, ["name", "elapsed"])
  }
}
