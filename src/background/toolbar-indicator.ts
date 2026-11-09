export interface ToolbarAction {
  setBadgeText(details: { tabId: number; text: string }): Promise<void>;
  setBadgeBackgroundColor(details: {
    tabId: number;
    color: string;
  }): Promise<void>;
  setTitle(details: { tabId: number; title: string }): Promise<void>;
}

// What the toolbar button says about the download in one tab.
export interface DownloadIndicator {
  showIdle(tabId: number): Promise<void>;
  showBusy(tabId: number): Promise<void>;
  showDone(tabId: number, filename: string): Promise<void>;
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

// Each tab downloads on its own, so each tab's button has its own look.
export class ToolbarIndicator implements DownloadIndicator {
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

  showDone(tabId: number, filename: string): Promise<void> {
    return this.show(tabId, {
      badge: "✓",
      colour: BLUE,
      title: `Downloaded ${filename}`,
    });
  }

  showError(tabId: number, message: string): Promise<void> {
    return this.show(tabId, {
      badge: "!",
      colour: RED,
      title: `Download failed: ${message}`,
    });
  }

  private async show(tabId: number, look: Look): Promise<void> {
    await Promise.all([
      this.action.setBadgeText({ tabId, text: look.badge }),
      this.action.setBadgeBackgroundColor({ tabId, color: look.colour }),
      this.action.setTitle({ tabId, title: look.title }),
    ]);
  }
}
