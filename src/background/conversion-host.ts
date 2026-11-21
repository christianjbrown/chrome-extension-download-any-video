import type { HiddenPage, OffscreenHost } from "./hidden-page";

const NOBODY = 0;

// Counts the conversions using the hidden page. The page stays open between
// them for its other work, so when the last one lets go it is swapped for a
// fresh page: that frees ffmpeg's memory and the blobs of the videos it made,
// and the next conversion starts with nothing left over.
export class ConversionHost implements OffscreenHost {
  private users = NOBODY;

  constructor(private readonly page: HiddenPage) {}

  async open(): Promise<void> {
    this.users += 1;
    try {
      await this.page.open();
    } catch (error) {
      this.users -= 1;
      throw error;
    }
  }

  async release(): Promise<void> {
    this.users -= 1;
    if (this.users === NOBODY) {
      await this.page.renew();
    }
  }
}
