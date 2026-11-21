import type { TrackFetcher } from "../stream/piece-fetcher";
import type { StreamReader } from "../stream/stream-reader";
import { AUDIO_TRACK, NO_STREAMS } from "../stream/tracks";
import { concatenate } from "./bytes";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";
import type { Fetches } from "./video-fetcher";

// A video the page only offers as a playlist: the pieces are fetched and
// joined into one file per track. Fragmented MP4 after its initialisation
// and MPEG-TS both play as a plain concatenation, so ffmpeg reads the result
// as it would any file, and muxes a separate sound track in with the picture.
export class StreamFetcher implements Fetches {
  constructor(
    private readonly reader: StreamReader,
    private readonly pieces: TrackFetcher,
  ) {}

  async fetch(url: string, onProgress: ProgressListener): Promise<MediaInputs> {
    const tracks = await this.reader.tracks(url);
    const fetched = await this.pieces.fetchAll(tracks, {
      report: (done, total) => {
        onProgress(done / total);
      },
    });
    const main = fetched.find((track) => track.role !== AUDIO_TRACK);
    const audio = fetched.find((track) => track.role === AUDIO_TRACK);
    if (main === undefined) {
      throw new Error(NO_STREAMS);
    }
    return {
      main: joined(main.parts),
      audio: audio === undefined ? undefined : joined(audio.parts),
    };
  }
}

function joined(parts: readonly ArrayBuffer[]): Uint8Array {
  return concatenate(parts.map((part) => new Uint8Array(part)));
}
