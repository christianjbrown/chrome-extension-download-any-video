import type { DownloadIndicator } from "./toolbar-indicator";

export interface TabChange {
  status?: string | undefined;
}

// The status Chrome gives a tab as it starts on a new page.
const LOADING = "loading";

// A new page in the tab is a new video, so the button goes back to normal.
export class NavigationReset {
  constructor(private readonly indicator: DownloadIndicator) {}

  async changed(tabId: number, change: TabChange): Promise<void> {
    if (change.status === LOADING) {
      await this.indicator.showIdle(tabId);
    }
  }
}
