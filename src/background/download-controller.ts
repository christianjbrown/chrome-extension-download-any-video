import type { Ranker } from "./candidate-ranker";
import type { ErrorExplainer } from "./chrome-errors";
import type { FrameAsker } from "./page-script";
import type { DownloadIndicator } from "./toolbar-indicator";
import type { Filenames } from "./video-filename";
import type { VideoDownloader } from "./video-saver";

export interface ClickedTab {
  id?: number | undefined;
}

export interface ControllerParts {
  readonly asker: FrameAsker;
  readonly ranker: Ranker;
  readonly names: Filenames;
  readonly saver: VideoDownloader;
  readonly indicator: DownloadIndicator;
  readonly errors: ErrorExplainer;
}

// A click on the toolbar button: find the video on that tab and download it.
export class DownloadController {
  private readonly busy = new Set<number>();

  constructor(private readonly parts: ControllerParts) {}

  async clicked(tab: ClickedTab): Promise<void> {
    const tabId = tab.id;
    // A click while the last one is still downloading does nothing.
    if (tabId === undefined || this.busy.has(tabId)) {
      return;
    }
    this.busy.add(tabId);
    try {
      await this.parts.indicator.showBusy(tabId);
      await this.parts.indicator.showDone(tabId, await this.download(tabId));
    } catch (error) {
      await this.parts.indicator.showError(
        tabId,
        this.parts.errors.explain(error),
      );
    } finally {
      this.busy.delete(tabId);
    }
  }

  // The top frame's title names the file, whichever frame the video was in.
  private async download(tabId: number): Promise<string> {
    const reports = await this.parts.asker.ask(tabId);
    const best = this.parts.ranker.pick(reports);
    const filename = this.parts.names.name(reports[0]?.title ?? "", best.url);
    await this.parts.saver.save(best.url, filename);
    return filename;
  }
}
