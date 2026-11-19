import type { AcceptedTask } from './task-record-model'

function runtimeEnvironmentOf(record: AcceptedTask): string | null {
  const { target } = record.binding.observation.fence.route
  return target.kind === 'environment' ? target.environmentId : null
}

/** Task records, indexed by the paired runtime their fence routes through (nested SSH included). */
export class TaskRecordsByEnvironment extends Map<string, AcceptedTask> {
  private keysByEnvironment = new Map<string, Set<string>>()

  override set(key: string, record: AcceptedTask): this {
    this.unindex(key)
    super.set(key, record)
    const environmentId = runtimeEnvironmentOf(record)
    if (environmentId !== null) {
      const keys = this.keysByEnvironment.get(environmentId) ?? new Set<string>()
      keys.add(key)
      this.keysByEnvironment.set(environmentId, keys)
    }
    return this
  }

  override delete(key: string): boolean {
    this.unindex(key)
    return super.delete(key)
  }

  override clear(): void {
    this.keysByEnvironment.clear()
    super.clear()
  }

  keysOn(environmentIds: Iterable<string>): string[] {
    return [...environmentIds].flatMap((id) => [...(this.keysByEnvironment.get(id) ?? [])])
  }

  // A rebind keeps the record's host id, so the runtime it was indexed under never moves.
  private unindex(key: string): void {
    const record = this.get(key)
    const environmentId = record && runtimeEnvironmentOf(record)
    const keys = environmentId ? this.keysByEnvironment.get(environmentId) : undefined
    keys?.delete(key)
    if (environmentId && keys?.size === 0) {
      this.keysByEnvironment.delete(environmentId)
    }
  }
}
