import type { Stage } from "../shared/conversion-messages";
import type { FinishedDownload, Look, ToolbarLooks } from "./toolbar-looks";

export interface ToolbarAction {
  setBadgeText(details: { tabId: number; text: string }): Promise<void>;
  setBadgeBackgroundColor(details: {
    tabId: number;
    color: string;
  }): Promise<void>;
  setTitle(details: { tabId: number; title: string }): Promise<void>;
}

// Puts a tab's button back to how it looks before any download.
export interface IdleIndicator {
  showIdle(tabId: number): Promise<void>;
}

// What the toolbar button says about the download in one tab.
export interface DownloadIndicator {
  showBusy(tabId: number): Promise<void>;
  showProgress(tabId: number, stage: Stage, ratio: number): Promise<void>;
  showDone(tabId: number, download: FinishedDownload): Promise<void>;
  showError(tabId: number, message: string): Promise<void>;
}

// Each tab downloads on its own, so each tab's button has its own look.
export class ToolbarIndicator implements IdleIndicator, DownloadIndicator {
  constructor(
    private readonly action: ToolbarAction,
    private readonly looks: ToolbarLooks,
  ) {}

  showIdle(tabId: number): Promise<void> {
    return this.paint(tabId, this.looks.idle());
  }

  showBusy(tabId: number): Promise<void> {
    return this.paint(tabId, this.looks.busy());
  }

  showProgress(tabId: number, stage: Stage, ratio: number): Promise<void> {
    return this.paint(tabId, this.looks.progress(stage, ratio));
  }

  showDone(tabId: number, download: FinishedDownload): Promise<void> {
    return this.paint(tabId, this.looks.done(download));
  }

  showError(tabId: number, message: string): Promise<void> {
    return this.paint(tabId, this.looks.error(message));
  }

  private async paint(tabId: number, look: Look): Promise<void> {
    await Promise.all([
      this.action.setBadgeText({ tabId, text: look.badge }),
      this.action.setBadgeBackgroundColor({ tabId, color: look.colour }),
      this.action.setTitle({ tabId, title: look.title }),
    ]);
  }
}
