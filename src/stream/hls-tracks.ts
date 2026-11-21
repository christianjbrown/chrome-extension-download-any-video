import { asList, required } from "../shared/optional";
import type { TextFetcher } from "./fetchers";
import type { AudioRendition, HlsParsing, MediaPlaylist, Variant } from "./hls";
import type { StreamReader } from "./playlists";
import type { StreamRefusals } from "./refusals";
import {
  AUDIO_TRACK,
  MUXED_TRACK,
  VIDEO_TRACK,
  type SizeChoice,
  type Track,
  type TrackRole,
} from "./tracks";

// The tallest variant of an HLS stream, and its sound track when that is
// fetched separately.
export class HlsTracks implements StreamReader {
  constructor(
    private readonly fetcher: TextFetcher,
    private readonly hls: HlsParsing,
    private readonly sizes: SizeChoice,
    private readonly refusals: StreamRefusals,
  ) {}

  async tracks(url: string): Promise<Track[]> {
    const text = await this.fetcher.text(url);
    return this.hls.isMaster(text)
      ? this.fromMaster(text, url)
      : [this.trackOf(MUXED_TRACK, this.hls.media(text, url))];
  }

  private async fromMaster(text: string, url: string): Promise<Track[]> {
    const master = this.hls.master(text, url);
    const chosen = required(
      this.sizes.best(master.variants),
      this.refusals.noStreams,
    );
    const audio = renditionFor(chosen, master.audio);
    return audio === undefined
      ? [await this.media(MUXED_TRACK, chosen.url)]
      : this.apart(chosen, audio);
  }

  // The picture and the sound, each fetched from its own playlist.
  private async apart(
    chosen: Variant,
    audio: AudioRendition,
  ): Promise<Track[]> {
    return [
      await this.media(VIDEO_TRACK, chosen.url),
      await this.media(AUDIO_TRACK, audio.url),
    ];
  }

  private async media(role: TrackRole, url: string): Promise<Track> {
    return this.trackOf(
      role,
      this.hls.media(await this.fetcher.text(url), url),
    );
  }

  private trackOf(role: TrackRole, playlist: MediaPlaylist): Track {
    this.checkNotEncrypted(playlist);
    return { role, pieces: [...asList(playlist.init), ...playlist.segments] };
  }

  private checkNotEncrypted(playlist: MediaPlaylist): void {
    if (playlist.encrypted) {
      throw new Error(this.refusals.encrypted);
    }
    this.checkNotEmpty(playlist);
  }

  private checkNotEmpty(playlist: MediaPlaylist): void {
    if (playlist.segments.length === 0) {
      throw new Error(this.refusals.emptyPlaylist);
    }
  }
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
