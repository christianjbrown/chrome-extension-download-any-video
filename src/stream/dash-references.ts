import type { DashParsing } from "./dash";
import type { TextFetcher } from "./fetching";
import type { StreamLister } from "./playlists";

// The pieces of every representation in a manifest.
export class DashReferences implements StreamLister {
  constructor(
    private readonly fetcher: TextFetcher,
    private readonly dash: DashParsing,
  ) {}

  async references(url: string): Promise<string[]> {
    const manifest = this.dash.parse(await this.fetcher.text(url), url);
    return manifest.representations.flatMap((representation) =>
      representation.pieces.map((piece) => piece.url),
    );
  }
}
