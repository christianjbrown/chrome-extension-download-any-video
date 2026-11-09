import type { AudioStream, StreamInfo, VideoStream } from "./stream-info";

export const INPUT_NAME = "input";
export const OUTPUT_NAME = "output.mp4";

export interface ConversionPlanning {
  // The ffmpeg arguments that turn INPUT_NAME into OUTPUT_NAME.
  plan(info: StreamInfo): string[];
}

export const NO_VIDEO = "There is no picture in that file, only sound";

// What plays everywhere: H.264 with 4:2:0 colour and AAC sound, in an MP4.
const COMPATIBLE_VIDEO_CODEC = "h264";
const COMPATIBLE_PIXEL_FORMAT = "yuv420p";
const COMPATIBLE_AUDIO_CODEC = "aac";

const FIRST_VIDEO_STREAM = "0:v:0";
// The trailing ? keeps ffmpeg from refusing a silent video.
const FIRST_AUDIO_STREAM_IF_ANY = "0:a:0?";

// Left to pick its own thread count, ffmpeg.wasm's multi-threaded build asks
// for more workers than it has and deadlocks; four decode and encode fine.
const THREADS: readonly string[] = ["-threads", "4"];

const COPY_VIDEO: readonly string[] = ["-c:v", "copy"];
// veryfast keeps a software encode bearable; CRF 20 looks like the original.
// H.264 needs even dimensions, so odd ones are rounded up by a pixel.
const ENCODE_VIDEO: readonly string[] = [
  ...THREADS,
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "20",
  "-pix_fmt",
  COMPATIBLE_PIXEL_FORMAT,
  "-profile:v",
  "high",
  "-vf",
  "scale=ceil(iw/2)*2:ceil(ih/2)*2",
];
const COPY_AUDIO: readonly string[] = ["-c:a", "copy"];
const ENCODE_AUDIO: readonly string[] = ["-c:a", "aac", "-b:a", "160k"];
// The index goes at the front of the file, so players start at once.
const FAST_START: readonly string[] = ["-movflags", "+faststart"];

function videoArguments(video: VideoStream): readonly string[] {
  const alreadyCompatible =
    video.codec === COMPATIBLE_VIDEO_CODEC &&
    video.pixelFormat === COMPATIBLE_PIXEL_FORMAT;
  return alreadyCompatible ? COPY_VIDEO : ENCODE_VIDEO;
}

function audioArguments(audio: AudioStream | undefined): readonly string[] {
  if (audio === undefined) {
    return [];
  }
  return audio.codec === COMPATIBLE_AUDIO_CODEC ? COPY_AUDIO : ENCODE_AUDIO;
}

// Streams that already play everywhere are copied as they are, so nothing is
// lost; anything else is re-encoded.
export class ConversionPlanner implements ConversionPlanning {
  plan(info: StreamInfo): string[] {
    if (info.video === undefined) {
      throw new Error(NO_VIDEO);
    }
    return [
      ...THREADS,
      "-i",
      INPUT_NAME,
      "-map",
      FIRST_VIDEO_STREAM,
      "-map",
      FIRST_AUDIO_STREAM_IF_ANY,
      ...videoArguments(info.video),
      ...audioArguments(info.audio),
      ...FAST_START,
      OUTPUT_NAME,
    ];
  }
}
