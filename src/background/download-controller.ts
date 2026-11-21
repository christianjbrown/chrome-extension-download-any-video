import type { FrameReport } from "../shared/candidates";
import type {
  CandidateFilter,
  ErrorExplainer,
  Filenames,
  FrameAsker,
  Ranker,
  TabLock,
  VideoDownloader,
} from "./download-steps";
import type { DownloadIndicator, FinishedDownload } from "./toolbar";
import type { VideoConverter } from "./video-converter";

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
  // A click while the last one is still downloading does nothing.
  readonly lock: TabLock;
}

// The frame whose title names the file: the page the person is on.
const TOP_FRAME = 0;
// A page with no title, which leaves the filename to fall back on its own.
const UNTITLED = "";

function topTitle(reports: readonly FrameReport[]): string | undefined {
  return reports[TOP_FRAME]?.title;
}

// A click on the toolbar button: find the video on that tab, make it an MP4
// that plays everywhere, and download it.
export class DownloadController {
  constructor(private readonly parts: ControllerParts) {}

  async clicked(tab: ClickedTab): Promise<void> {
    const tabId = tab.id;
    if (tabId !== undefined) {
      await this.parts.lock.runAlone(tabId, () => this.attempt(tabId));
    }
  }

  private async attempt(tabId: number): Promise<void> {
    try {
      await this.parts.indicator.showBusy(tabId);
      await this.parts.indicator.showDone(tabId, await this.download(tabId));
    } catch (error) {
      await this.parts.indicator.showError(
        tabId,
        this.parts.errors.explain(error),
      );
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
        topTitle(reports) ?? UNTITLED,
        source.extension,
      );
      await this.parts.saver.save(source.url, filename);
      return { filename, converted: source.converted };
    } finally {
      await source.release();
    }
  }
}
