import type { TextFetcher } from "./fetching";
import {
  isMasterPlaylist,
  parseMasterPlaylist,
  parseMediaPlaylist,
  type AudioRendition,
  type MediaPlaylist,
  type Variant,
} from "./hls-playlist";
import type { StreamReader } from "./playlists";
import {
  AUDIO_TRACK,
  EMPTY_PLAYLIST,
  ENCRYPTED_STREAM,
  MUXED_TRACK,
  NO_STREAMS,
  sharpest,
  VIDEO_TRACK,
  type Track,
  type TrackRole,
} from "./tracks";

// The tallest variant of an HLS stream, and its sound track when that is
// fetched separately.
export class HlsTracks implements StreamReader {
  constructor(private readonly fetcher: TextFetcher) {}

  async tracks(url: string): Promise<Track[]> {
    const text = await this.fetcher.text(url);
    if (!isMasterPlaylist(text)) {
      return [trackOf(MUXED_TRACK, parseMediaPlaylist(text, url))];
    }
    const master = parseMasterPlaylist(text, url);
    const chosen = sharpest(master.variants);
    if (chosen === undefined) {
      throw new Error(NO_STREAMS);
    }
    const audio = renditionFor(chosen, master.audio);
    if (audio === undefined) {
      return [await this.media(MUXED_TRACK, chosen.url)];
    }
    return [
      await this.media(VIDEO_TRACK, chosen.url),
      await this.media(AUDIO_TRACK, audio.url),
    ];
  }

  private async media(role: TrackRole, url: string): Promise<Track> {
    return trackOf(role, parseMediaPlaylist(await this.fetcher.text(url), url));
  }
}

function trackOf(role: TrackRole, playlist: MediaPlaylist): Track {
  if (playlist.encrypted) {
    throw new Error(ENCRYPTED_STREAM);
  }
  if (playlist.segments.length === 0) {
    throw new Error(EMPTY_PLAYLIST);
  }
  const { init, segments } = playlist;
  return { role, pieces: init === undefined ? segments : [init, ...segments] };
}

// The sound track a variant names, preferring the one marked default. A
// variant that names no group, or whose group has no separately fetched
// renditions, carries its sound in its own pieces.
function renditionFor(
  variant: Variant,
  renditions: readonly AudioRendition[],
): AudioRendition | undefined {
  const inGroup = renditions.filter(
    (rendition) => rendition.group === variant.audioGroup,
  );
  return inGroup.find((rendition) => rendition.isDefault) ?? inGroup[0];
}
