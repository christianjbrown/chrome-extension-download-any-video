import { parseManifest, type DashRepresentation } from "./dash-manifest";
import type { TextFetcher } from "./fetching";
import type { StreamReader } from "./stream-reader";
import {
  EMPTY_PLAYLIST,
  ENCRYPTED_STREAM,
  LIVE_STREAM,
  NO_STREAMS,
  sharpest,
  type Track,
} from "./tracks";
import type { XmlParser } from "./xml";

// The sharpest picture of a DASH stream, and its best sound when it has any.
export class DashTracks implements StreamReader {
  constructor(
    private readonly fetcher: TextFetcher,
    private readonly parse: XmlParser,
  ) {}

  async tracks(url: string): Promise<Track[]> {
    const manifest = parseManifest(
      this.parse(await this.fetcher.text(url)),
      url,
    );
    if (manifest.live) {
      throw new Error(LIVE_STREAM);
    }
    if (manifest.encrypted) {
      throw new Error(ENCRYPTED_STREAM);
    }
    const video = sharpest(ofRole(manifest.representations, "video"));
    if (video === undefined) {
      throw new Error(NO_STREAMS);
    }
    const audio = sharpest(ofRole(manifest.representations, "audio"));
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
