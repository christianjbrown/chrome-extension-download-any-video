import type { Sequencer } from "../shared/sequencer";
import type { HiddenPage } from "./hidden-page";

export interface OffscreenApi {
  createDocument(parameters: {
    url: string;
    reasons: string[];
    justification: string;
  }): Promise<void>;
  closeDocument(): Promise<void>;
}

const OFFSCREEN_CONTEXT = "OFFSCREEN_DOCUMENT";

export interface ContextsApi {
  getContexts(filter: {
    contextTypes: (typeof OFFSCREEN_CONTEXT)[];
  }): Promise<unknown[]>;
}

// Everything the page does: ffmpeg runs in a web worker, and the page watches
// Chrome's colour scheme for the toolbar icon.
const REASONS = ["WORKERS", "MATCH_MEDIA"];
const JUSTIFICATION =
  "Turns the video into an H.264 MP4 in a web worker before saving it, and reads the colour scheme so the toolbar icon matches it";

// Chrome allows one offscreen document per extension, and this is the only
// place that creates or closes it. It asks Chrome whether the document is
// there every time, because the service worker may have restarted since, and
// takes its steps one at a time, so several events waking the worker at once
// cannot create two, or close one that is still being created.
export class OffscreenDocument implements HiddenPage {
  constructor(
    private readonly offscreen: OffscreenApi,
    private readonly runtime: ContextsApi,
    // The extension's page to open.
    private readonly page: string,
    private readonly queue: Sequencer,
  ) {}

  open(): Promise<void> {
    return this.queue.run(async () => {
      if (!(await this.exists())) {
        await this.create();
      }
    });
  }

  renew(): Promise<void> {
    return this.queue.run(async () => {
      if (await this.exists()) {
        await this.offscreen.closeDocument();
      }
      await this.create();
    });
  }

  private async exists(): Promise<boolean> {
    const existing = await this.runtime.getContexts({
      contextTypes: [OFFSCREEN_CONTEXT],
    });
    return existing.length > 0;
  }

  private create(): Promise<void> {
    return this.offscreen.createDocument({
      url: this.page,
      reasons: REASONS,
      justification: JUSTIFICATION,
    });
  }
}
