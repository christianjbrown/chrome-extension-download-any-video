// Everything a playlist points at: its sub-playlists and every piece of every
// track. A page's network log shows these too, and none of them is the whole
// video, however much a lone init.mp4 or DASH_720.mp4 looks like one.
import { playlistFormat, type PlaylistFormat } from "../shared/media-urls";
import { parseManifest } from "./dash-manifest";
import type { TextFetcher } from "./fetching";
import {
  isMasterPlaylist,
  parseMasterPlaylist,
  parseMediaPlaylist,
  type MediaPlaylist,
} from "./hls-playlist";
import { NOT_A_PLAYLIST } from "./stream-reader";
import type { XmlParser } from "./xml";

export interface StreamLister {
  references(url: string): Promise<string[]>;
}

export class PlaylistLister implements StreamLister {
  constructor(
    private readonly listers: Readonly<Record<PlaylistFormat, StreamLister>>,
  ) {}

  references(url: string): Promise<string[]> {
    const format = playlistFormat(url);
    if (format === undefined) {
      return Promise.reject(new Error(NOT_A_PLAYLIST));
    }
    return this.listers[format].references(url);
  }
}

// A master playlist's variants and renditions, and the pieces of each of
// those; or a media playlist's own pieces.
export class HlsReferences implements StreamLister {
  constructor(private readonly fetcher: TextFetcher) {}

  async references(url: string): Promise<string[]> {
    const text = await this.fetcher.text(url);
    if (!isMasterPlaylist(text)) {
      return piecesOf(parseMediaPlaylist(text, url));
    }
    const master = parseMasterPlaylist(text, url);
    const playlists = [
      ...master.variants.map((variant) => variant.url),
      ...master.audio.map((rendition) => rendition.url),
    ];
    const pieces = await Promise.all(
      playlists.map(async (playlist) =>
        piecesOf(
          parseMediaPlaylist(await this.fetcher.text(playlist), playlist),
        ),
      ),
    );
    return [...playlists, ...pieces.flat()];
  }
}

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

function piecesOf(playlist: MediaPlaylist): string[] {
  const { init, segments } = playlist;
  return [init, ...segments].flatMap((piece) =>
    piece === undefined ? [] : [piece.url],
  );
}
