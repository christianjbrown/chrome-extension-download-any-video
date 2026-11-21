import type { TextFetcher } from "./fetchers";
import type { HlsParsing, MediaPlaylist } from "./hls";
import type { StreamLister } from "./playlists";

function piecesOf(playlist: MediaPlaylist): string[] {
  const { init, segments } = playlist;
  return [init, ...segments].flatMap((piece) =>
    piece === undefined ? [] : [piece.url],
  );
}

// A master playlist's variants and renditions, and the pieces of each of
// those; or a media playlist's own pieces.
export class HlsReferences implements StreamLister {
  constructor(
    private readonly fetcher: TextFetcher,
    private readonly hls: HlsParsing,
  ) {}

  async references(url: string): Promise<string[]> {
    const text = await this.fetcher.text(url);
    if (!this.hls.isMaster(text)) {
      return piecesOf(this.hls.media(text, url));
    }
    const master = this.hls.master(text, url);
    const playlists = [
      ...master.variants.map((variant) => variant.url),
      ...master.audio.map((rendition) => rendition.url),
    ];
    const pieces = await Promise.all(
      playlists.map(async (playlist) =>
        piecesOf(this.hls.media(await this.fetcher.text(playlist), playlist)),
      ),
    );
    return [...playlists, ...pieces.flat()];
  }
}
