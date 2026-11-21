import type { ColourScheme } from "../shared/colour-scheme";
import type { SchemeReader, TabSchemeSink } from "./scheme-parts";

// A click on the button lets the extension into that tab, which is the one
// chance to see the colour scheme Chrome itself is in.
export class ClickScheme {
  constructor(
    private readonly reader: SchemeReader,
    private readonly sink: TabSchemeSink,
  ) {}

  async clicked(tab: { id?: number | undefined }): Promise<void> {
    if (tab.id === undefined) {
      return;
    }
    await this.show(await this.reader.read(tab.id));
  }

  // A tab that could not be read says nothing.
  private async show(scheme: ColourScheme | undefined): Promise<void> {
    if (scheme !== undefined) {
      await this.sink.tabShows(scheme);
    }
  }
}
