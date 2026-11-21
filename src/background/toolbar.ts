// The toolbar button: what it can be told about a download, and what it is
// drawn with.
import type { Stage } from "../shared/conversion-messages";

// The part of chrome.action that draws a tab's button.
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

// What the toolbar button shows: the badge, its colour and the tooltip.
export interface Look {
  readonly badge: string;
  readonly colour: string;
  readonly title: string;
}

export interface FinishedDownload {
  readonly filename: string;
  // False when the file is the site's own, because converting it did not work.
  readonly converted: boolean;
}

// How the button looks at each point of a download.
export interface ToolbarLooks {
  idle(): Look;
  busy(): Look;
  progress(stage: Stage, ratio: number): Look;
  done(download: FinishedDownload): Look;
  error(message: string): Look;
}

// The one look this needs, to tell whether progress would show anything new.
export interface ProgressLooks {
  progress(stage: Stage, ratio: number): Look;
}
