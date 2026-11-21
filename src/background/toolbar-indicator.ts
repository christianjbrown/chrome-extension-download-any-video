import type { Stage } from "../shared/conversion-messages";
import type {
  DownloadIndicator,
  FinishedDownload,
  IdleIndicator,
  Look,
  ToolbarAction,
  ToolbarLooks,
} from "./toolbar";

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
