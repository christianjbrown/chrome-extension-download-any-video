import type { TabLock } from "./download-steps";

// Remembers which tabs are busy, for as long as their work runs.
export class BusyTabs implements TabLock {
  private readonly busy = new Set<number>();

  async runAlone(tabId: number, work: () => Promise<void>): Promise<void> {
    if (!this.busy.has(tabId)) {
      await this.run(tabId, work);
    }
  }

  private async run(tabId: number, work: () => Promise<void>): Promise<void> {
    this.busy.add(tabId);
    try {
      await work();
    } finally {
      this.busy.delete(tabId);
    }
  }
}
