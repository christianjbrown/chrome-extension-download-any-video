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

// The hidden page that does the converting: open while anyone needs it,
// closed once nobody does.
export interface OffscreenHost {
  open(): Promise<void>;
  release(): Promise<void>;
}

const PAGE = "offscreen.html";
const REASONS = ["WORKERS"];
const JUSTIFICATION =
  "Turns the video into an H.264 MP4 in a web worker before saving it";
const NOBODY = 0;

// Chrome allows one offscreen document per extension, so this counts its users
// and only creates or closes it at the edges.
export class OffscreenDocument implements OffscreenHost {
  private users = NOBODY;
  private opening: Promise<void> | undefined;

  constructor(
    private readonly offscreen: OffscreenApi,
    private readonly runtime: ContextsApi,
  ) {}

  async open(): Promise<void> {
    this.users += 1;
    this.opening ??= this.create();
    try {
      await this.opening;
    } catch (error) {
      this.users -= 1;
      this.opening = undefined;
      throw error;
    }
  }

  async release(): Promise<void> {
    this.users -= 1;
    if (this.users === NOBODY) {
      this.opening = undefined;
      await this.offscreen.closeDocument();
    }
  }

  // The service worker may have restarted since it last opened the document.
  private async create(): Promise<void> {
    const existing = await this.runtime.getContexts({
      contextTypes: [OFFSCREEN_CONTEXT],
    });
    if (existing.length === 0) {
      await this.offscreen.createDocument({
        url: PAGE,
        reasons: REASONS,
        justification: JUSTIFICATION,
      });
    }
  }
}
