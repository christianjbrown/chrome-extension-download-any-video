import type { DashParsing, DashRepresentation } from "./dash";
import type { TextFetcher } from "./fetchers";
import type { StreamReader } from "./playlists";
import {
  AUDIO_TRACK,
  EMPTY_PLAYLIST,
  ENCRYPTED_STREAM,
  LIVE_STREAM,
  NO_STREAMS,
  sharpest,
  VIDEO_TRACK,
  type Track,
} from "./tracks";

// The sharpest picture of a DASH stream, and its best sound when it has any.
export class DashTracks implements StreamReader {
  constructor(
    private readonly fetcher: TextFetcher,
    private readonly dash: DashParsing,
  ) {}

  async tracks(url: string): Promise<Track[]> {
    const manifest = this.dash.parse(await this.fetcher.text(url), url);
    if (manifest.live) {
      throw new Error(LIVE_STREAM);
    }
    if (manifest.encrypted) {
      throw new Error(ENCRYPTED_STREAM);
    }
    const video = sharpest(ofRole(manifest.representations, VIDEO_TRACK));
    if (video === undefined) {
      throw new Error(NO_STREAMS);
    }
    const audio = sharpest(ofRole(manifest.representations, AUDIO_TRACK));
    return [video, ...(audio === undefined ? [] : [audio])].map(track);
  }
}

function ofRole(
  representations: readonly DashRepresentation[],
  role: DashRepresentation["role"],
): DashRepresentation[] {
  return representations.filter((r) => r.role === role);
}

function track(representation: DashRepresentation): Track {
  if (representation.pieces.length === 0) {
    throw new Error(EMPTY_PLAYLIST);
  }
  return { role: representation.role, pieces: representation.pieces };
}
