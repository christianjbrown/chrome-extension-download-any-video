import type { DownloadIndicator } from "./toolbar-indicator";

export interface TabChange {
  status?: string | undefined;
}

// A new page in the tab is a new video, so the button goes back to normal.
export class NavigationReset {
  constructor(private readonly indicator: DownloadIndicator) {}

  async changed(tabId: number, change: TabChange): Promise<void> {
    if (change.status === "loading") {
      await this.indicator.showIdle(tabId);
    }
  }
}
