import { asList, required } from "../shared/optional";
import type { DashManifest, DashParsing, DashRepresentation } from "./dash";
import type { TextFetcher } from "./fetchers";
import type { StreamReader } from "./playlists";
import type { StreamRefusals } from "./refusals";
import {
  AUDIO_TRACK,
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
    private readonly refusals: StreamRefusals,
  ) {}

  async tracks(url: string): Promise<Track[]> {
    const manifest = this.dash.parse(await this.fetcher.text(url), url);
    this.checkNotLive(manifest);
    const video = required(
      this.sizes.best(ofRole(manifest.representations, VIDEO_TRACK)),
      this.refusals.noStreams,
    );
    const audio = this.sizes.best(
      ofRole(manifest.representations, AUDIO_TRACK),
    );
    return [video, ...asList(audio)].map((chosen) => this.track(chosen));
  }

  private checkNotLive(manifest: DashManifest): void {
    if (manifest.live) {
      throw new Error(this.refusals.live);
    }
    this.checkNotEncrypted(manifest);
  }

  private checkNotEncrypted(manifest: DashManifest): void {
    if (manifest.encrypted) {
      throw new Error(this.refusals.encrypted);
    }
  }

  private track(representation: DashRepresentation): Track {
    if (representation.pieces.length === 0) {
      throw new Error(this.refusals.emptyPlaylist);
    }
    return { role: representation.role, pieces: representation.pieces };
  }
}

function ofRole(
  representations: readonly DashRepresentation[],
  role: DashRepresentation["role"],
): DashRepresentation[] {
  return representations.filter((r) => r.role === role);
}
