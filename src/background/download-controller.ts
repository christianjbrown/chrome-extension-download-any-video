import type { Ranker } from "./candidate-ranker";
import type { ErrorExplainer } from "./chrome-errors";
import type { FrameAsker } from "./page-script";
import type { CandidateFilter } from "./piece-filter";
import type { DownloadIndicator, FinishedDownload } from "./toolbar-indicator";
import type { VideoConverter } from "./video-converter";
import type { Filenames } from "./video-filename";
import type { VideoDownloader } from "./video-saver";

export interface ClickedTab {
  id?: number | undefined;
}

export interface ControllerParts {
  readonly asker: FrameAsker;
  readonly filter: CandidateFilter;
  readonly ranker: Ranker;
  readonly converter: VideoConverter;
  readonly names: Filenames;
  readonly saver: VideoDownloader;
  readonly indicator: DownloadIndicator;
  readonly errors: ErrorExplainer;
}

// A click on the toolbar button: find the video on that tab, make it an MP4
// that plays everywhere, and download it.
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
  private async download(tabId: number): Promise<FinishedDownload> {
    const reports = await this.parts.asker.ask(tabId);
    const best = this.parts.ranker.pick(
      await this.parts.filter.filter(reports),
    );
    const source = await this.parts.converter.convert(
      best.url,
      (stage, ratio) => {
        void this.parts.indicator.showProgress(tabId, stage, ratio);
      },
    );
    try {
      const filename = this.parts.names.name(
        reports[0]?.title ?? "",
        source.extension,
      );
      await this.parts.saver.save(source.url, filename);
      return { filename, converted: source.converted };
    } finally {
      await source.release();
    }
  }
}
