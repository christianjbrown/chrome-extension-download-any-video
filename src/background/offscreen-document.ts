import type { Sequencer } from "../shared/sequencer";
import type { HiddenPage } from "./hidden-page";
import type { OffscreenPage } from "./offscreen-page";

export interface OffscreenApi {
  createDocument(parameters: OffscreenPage): Promise<void>;
  closeDocument(): Promise<void>;
}

const OFFSCREEN_CONTEXT = "OFFSCREEN_DOCUMENT";

export interface ContextsApi {
  getContexts(filter: {
    contextTypes: (typeof OFFSCREEN_CONTEXT)[];
  }): Promise<unknown[]>;
}

// Chrome allows one offscreen document per extension, and this is the only
// place that creates or closes it. It asks Chrome whether the document is
// there every time, because the service worker may have restarted since, and
// takes its steps one at a time, so several events waking the worker at once
// cannot create two, or close one that is still being created.
export class OffscreenDocument implements HiddenPage {
  constructor(
    private readonly offscreen: OffscreenApi,
    private readonly runtime: ContextsApi,
    private readonly page: OffscreenPage,
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
    return this.offscreen.createDocument(this.page);
  }
}
