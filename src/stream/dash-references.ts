import { parseManifest } from "./dash-manifest";
import type { TextFetcher } from "./fetching";
import type { StreamLister } from "./playlists";
import type { XmlParser } from "./xml";

// The pieces of every representation in a manifest.
export class DashReferences implements StreamLister {
  constructor(
    private readonly fetcher: TextFetcher,
    private readonly parse: XmlParser,
  ) {}

  async references(url: string): Promise<string[]> {
    const manifest = parseManifest(
      this.parse(await this.fetcher.text(url)),
      url,
    );
    return manifest.representations.flatMap((representation) =>
      representation.pieces.map((piece) => piece.url),
    );
  }
}
