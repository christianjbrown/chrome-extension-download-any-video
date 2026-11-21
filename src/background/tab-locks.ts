// Lets one piece of work run per tab at a time.
export interface TabLock {
  // Runs the work unless the tab's last work is still going, in which case it
  // does nothing.
  runAlone(tabId: number, work: () => Promise<void>): Promise<void>;
}

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
