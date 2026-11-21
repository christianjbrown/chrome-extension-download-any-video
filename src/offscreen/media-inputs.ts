import type { TrackRole } from "../stream/tracks";

// What the fetch stage hands the transcoder: the video as one file, or, when
// a stream keeps its sound apart from its picture, the two as separate files
// for ffmpeg to mux.
export interface MediaInputs {
  readonly main: Uint8Array;
  readonly audio: Uint8Array | undefined;
}

// Which roles of track go into each input. A new role joins one set in the
// offscreen entry point.
export interface InputRoles {
  readonly main: ReadonlySet<TrackRole>;
  readonly audio: ReadonlySet<TrackRole>;
}
