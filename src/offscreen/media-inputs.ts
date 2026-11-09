// What the fetch stage hands the transcoder: the video as one file, or, when
// a stream keeps its sound apart from its picture, the two as separate files
// for ffmpeg to mux.
export interface MediaInputs {
  readonly main: Uint8Array;
  readonly audio: Uint8Array | undefined;
}
