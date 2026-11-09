import { FETCH_STAGE, type Stage } from "../shared/conversion-messages";

export interface ToolbarAction {
  setBadgeText(details: { tabId: number; text: string }): Promise<void>;
  setBadgeBackgroundColor(details: {
    tabId: number;
    color: string;
  }): Promise<void>;
  setTitle(details: { tabId: number; title: string }): Promise<void>;
}

export interface FinishedDownload {
  readonly filename: string;
  // False when the file is the site's own, because converting it did not work.
  readonly converted: boolean;
}

// What the toolbar button says about the download in one tab.
export interface DownloadIndicator {
  showIdle(tabId: number): Promise<void>;
  showBusy(tabId: number): Promise<void>;
  showProgress(tabId: number, stage: Stage, ratio: number): Promise<void>;
  showDone(tabId: number, download: FinishedDownload): Promise<void>;
  showError(tabId: number, message: string): Promise<void>;
}

interface Look {
  badge: string;
  colour: string;
  title: string;
}

const RED = "#dc2626";
const BLUE = "#1a73e8";
const GREY = "#5a5a60";

const IDLE_TITLE = "Download the video on this page";
const PERCENT = 100;

function percent(ratio: number): string {
  return `${String(Math.round(ratio * PERCENT))}%`;
}

function doneTitle(download: FinishedDownload): string {
  return download.converted
    ? `Downloaded ${download.filename}`
    : `Downloaded ${download.filename}, as the site served it: it could not be converted`;
}

function stageTitle(stage: Stage, shown: string): string {
  return stage === FETCH_STAGE
    ? `Fetching the video (${shown})`
    : `Converting the video to H.264 (${shown})`;
}

// Each tab downloads on its own, so each tab's button has its own look.
export class ToolbarIndicator implements DownloadIndicator {
  // Progress arrives many times a second; the button only redraws on a change.
  private readonly lastProgress = new Map<number, string>();

  constructor(private readonly action: ToolbarAction) {}

  showIdle(tabId: number): Promise<void> {
    return this.show(tabId, { badge: "", colour: GREY, title: IDLE_TITLE });
  }

  showBusy(tabId: number): Promise<void> {
    return this.show(tabId, {
      badge: "…",
      colour: BLUE,
      title: "Looking for the video and downloading it",
    });
  }

  async showProgress(
    tabId: number,
    stage: Stage,
    ratio: number,
  ): Promise<void> {
    const shown = percent(ratio);
    const key = `${stage} ${shown}`;
    if (this.lastProgress.get(tabId) === key) {
      return;
    }
    this.lastProgress.set(tabId, key);
    await this.paint(tabId, {
      badge: shown,
      colour: BLUE,
      title: stageTitle(stage, shown),
    });
  }

  showDone(tabId: number, download: FinishedDownload): Promise<void> {
    return this.show(tabId, {
      badge: "✓",
      colour: BLUE,
      title: doneTitle(download),
    });
  }

  showError(tabId: number, message: string): Promise<void> {
    return this.show(tabId, {
      badge: "!",
      colour: RED,
      title: `Download failed: ${message}`,
    });
  }

  private show(tabId: number, look: Look): Promise<void> {
    this.lastProgress.delete(tabId);
    return this.paint(tabId, look);
  }

  private async paint(tabId: number, look: Look): Promise<void> {
    await Promise.all([
      this.action.setBadgeText({ tabId, text: look.badge }),
      this.action.setBadgeBackgroundColor({ tabId, color: look.colour }),
      this.action.setTitle({ tabId, title: look.title }),
    ]);
  }
}
