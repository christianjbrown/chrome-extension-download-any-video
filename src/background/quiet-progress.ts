import type { Stage } from "../shared/conversion-messages";
import type { DownloadIndicator, IdleIndicator } from "./toolbar-indicator";
import type { FinishedDownload, Look } from "./toolbar-looks";

// The one look this needs, to tell whether progress would show anything new.
export interface ProgressLooks {
  progress(stage: Stage, ratio: number): Look;
}

const shownAs = (look: Look): string => `${look.badge} ${look.title}`;

// Progress arrives many times a second; the button only redraws on a change.
// Anything else the button shows is always drawn, and forgets the progress.
export class QuietProgress implements IdleIndicator, DownloadIndicator {
  private readonly lastProgress = new Map<number, string>();

  constructor(
    private readonly inner: IdleIndicator & DownloadIndicator,
    private readonly looks: ProgressLooks,
  ) {}

  showIdle(tabId: number): Promise<void> {
    this.lastProgress.delete(tabId);
    return this.inner.showIdle(tabId);
  }

  showBusy(tabId: number): Promise<void> {
    this.lastProgress.delete(tabId);
    return this.inner.showBusy(tabId);
  }

  async showProgress(
    tabId: number,
    stage: Stage,
    ratio: number,
  ): Promise<void> {
    const shown = shownAs(this.looks.progress(stage, ratio));
    if (this.lastProgress.get(tabId) === shown) {
      return;
    }
    this.lastProgress.set(tabId, shown);
    await this.inner.showProgress(tabId, stage, ratio);
  }

  showDone(tabId: number, download: FinishedDownload): Promise<void> {
    this.lastProgress.delete(tabId);
    return this.inner.showDone(tabId, download);
  }

  showError(tabId: number, message: string): Promise<void> {
    this.lastProgress.delete(tabId);
    return this.inner.showError(tabId, message);
  }
}
