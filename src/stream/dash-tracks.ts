import { asList, required } from "../shared/optional";
import type { DashManifest, DashParsing, DashRepresentation } from "./dash";
import type { TextFetcher } from "./fetchers";
import type { StreamReader } from "./playlists";
import {
  AUDIO_TRACK,
  EMPTY_PLAYLIST,
  ENCRYPTED_STREAM,
  LIVE_STREAM,
  NO_STREAMS,
  VIDEO_TRACK,
  type SizeChoice,
  type Track,
} from "./tracks";

// The sharpest picture of a DASH stream, and its best sound when it has any.
export class DashTracks implements StreamReader {
  constructor(
    private readonly fetcher: TextFetcher,
    private readonly dash: DashParsing,
    private readonly sizes: SizeChoice,
  ) {}

  async tracks(url: string): Promise<Track[]> {
    const manifest = this.dash.parse(await this.fetcher.text(url), url);
    checkNotLive(manifest);
    const video = required(
      this.sizes.best(ofRole(manifest.representations, VIDEO_TRACK)),
      NO_STREAMS,
    );
    const audio = this.sizes.best(
      ofRole(manifest.representations, AUDIO_TRACK),
    );
    return [video, ...asList(audio)].map(track);
  }
}

function checkNotLive(manifest: DashManifest): void {
  if (manifest.live) {
    throw new Error(LIVE_STREAM);
  }
  checkNotEncrypted(manifest);
}

function checkNotEncrypted(manifest: DashManifest): void {
  if (manifest.encrypted) {
    throw new Error(ENCRYPTED_STREAM);
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
