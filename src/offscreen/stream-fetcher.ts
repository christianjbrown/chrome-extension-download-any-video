import { ifDefined, required } from "../shared/optional";
import type { FetchedTrack, TrackFetcher } from "../stream/fetchers";
import type { StreamReader } from "../stream/playlists";
import type { StreamRefusals } from "../stream/refusals";
import { concatenate } from "./bytes";
import type { Fetches } from "./conversion-parts";
import type { InputRoles, MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";

// A video the page only offers as a playlist: the pieces are fetched and
// joined into one file per track. Fragmented MP4 after its initialisation
// and MPEG-TS both play as a plain concatenation, so ffmpeg reads the result
// as it would any file, and muxes a separate sound track in with the picture.
export class StreamFetcher implements Fetches {
  constructor(
    private readonly reader: StreamReader,
    private readonly pieces: TrackFetcher,
    private readonly roles: InputRoles,
    private readonly refusals: Pick<StreamRefusals, "noStreams">,
  ) {}

  async fetch(url: string, onProgress: ProgressListener): Promise<MediaInputs> {
    const tracks = await this.reader.tracks(url);
    const fetched = await this.pieces.fetchAll(tracks, {
      report: (done, total) => {
        onProgress(done / total);
      },
    });
    const main = fetched.find((track) => this.roles.main.has(track.role));
    const audio = fetched.find((track) => this.roles.audio.has(track.role));
    return {
      main: joined(required(main, this.refusals.noStreams)),
      audio: ifDefined(audio, joined),
    };
  }
}

function joined(track: FetchedTrack): Uint8Array {
  return concatenate(track.parts.map((part) => new Uint8Array(part)));
}
