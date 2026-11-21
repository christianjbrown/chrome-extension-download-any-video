import { CONVERTED_EXTENSION } from "../shared/conversion-messages";
import type { AudioStream, StreamInfo, VideoStream } from "./stream-info";

export const INPUT_NAME = "input";
// A stream's sound, when it came as a separate track.
export const AUDIO_INPUT_NAME = "audio-input";
export const OUTPUT_NAME = `output.${CONVERTED_EXTENSION}`;

// The flag that names an input file, in a plan and when asking about a file.
export const INPUT_FLAG = "-i";
const MAP_FLAG = "-map";

export interface ConversionPlanning {
  // The ffmpeg arguments that turn the inputs into OUTPUT_NAME: the picture
  // from INPUT_NAME, the sound from AUDIO_INPUT_NAME when there is one and
  // otherwise from INPUT_NAME too.
  plan(main: StreamInfo, audio: StreamInfo | undefined): string[];
}

// How hard ffmpeg works on a video it has to re-encode, and what it aims for.
export interface EncodeSettings {
  // Left to pick its own thread count, ffmpeg.wasm's multi-threaded build
  // asks for more workers than it has and deadlocks.
  readonly threads: number;
  // x264's speed against size trade.
  readonly preset: string;
  // x264's constant quality: lower looks better and takes more room.
  readonly crf: number;
  // The H.264 profile, which decides which players can open the file.
  readonly profile: string;
  // What the sound is re-encoded at, in ffmpeg's own notation.
  readonly audioBitrate: string;
}

export const NO_VIDEO = "There is no picture in that file, only sound";

// What plays everywhere: H.264 with 4:2:0 colour and AAC sound, in an MP4.
const COMPATIBLE_VIDEO_CODEC = "h264";
const COMPATIBLE_PIXEL_FORMAT = "yuv420p";
const COMPATIBLE_AUDIO_CODEC = "aac";

const FIRST_VIDEO_STREAM = "0:v:0";
// The trailing ? keeps ffmpeg from refusing a silent video.
const FIRST_AUDIO_STREAM_IF_ANY = "0:a:0?";
const SECOND_INPUT_AUDIO_IF_ANY = "1:a:0?";

// ffmpeg's own flags and values, as its command line spells them.
const THREADS_FLAG = "-threads";
const VIDEO_CODEC_FLAG = "-c:v";
const AUDIO_CODEC_FLAG = "-c:a";
const PRESET_FLAG = "-preset";
const CRF_FLAG = "-crf";
const PIXEL_FORMAT_FLAG = "-pix_fmt";
const PROFILE_FLAG = "-profile:v";
const VIDEO_FILTER_FLAG = "-vf";
const AUDIO_BITRATE_FLAG = "-b:a";
const MOV_FLAGS_FLAG = "-movflags";
// Keeps a stream's encoded bytes as they are.
const COPY_CODEC = "copy";
const H264_ENCODER = "libx264";
// The index goes at the front of the file, so players start at once.
const FAST_START_FLAG = "+faststart";

const threads = (settings: EncodeSettings): readonly string[] => [
  THREADS_FLAG,
  String(settings.threads),
];

const COPY_VIDEO: readonly string[] = [VIDEO_CODEC_FLAG, COPY_CODEC];
// H.264 needs even dimensions, so odd ones are rounded up by a pixel.
const EVEN_DIMENSIONS = "scale=ceil(iw/2)*2:ceil(ih/2)*2";
const encodeVideo = (settings: EncodeSettings): readonly string[] => [
  ...threads(settings),
  VIDEO_CODEC_FLAG,
  H264_ENCODER,
  PRESET_FLAG,
  settings.preset,
  CRF_FLAG,
  String(settings.crf),
  PIXEL_FORMAT_FLAG,
  COMPATIBLE_PIXEL_FORMAT,
  PROFILE_FLAG,
  settings.profile,
  VIDEO_FILTER_FLAG,
  EVEN_DIMENSIONS,
];
const COPY_AUDIO: readonly string[] = [AUDIO_CODEC_FLAG, COPY_CODEC];
const encodeAudio = (settings: EncodeSettings): readonly string[] => [
  AUDIO_CODEC_FLAG,
  COMPATIBLE_AUDIO_CODEC,
  AUDIO_BITRATE_FLAG,
  settings.audioBitrate,
];
const FAST_START: readonly string[] = [MOV_FLAGS_FLAG, FAST_START_FLAG];

// A stream that can go into the MP4 without re-encoding, and how.
interface Shortcut<S> {
  readonly suits: (stream: S) => boolean;
  readonly args: readonly string[];
}

// The first shortcut that suits the stream, or a re-encode when none does.
// Another copyable codec is another entry here.
function treatment<S>(
  shortcuts: readonly Shortcut<S>[],
  stream: S,
  encode: readonly string[],
): readonly string[] {
  return shortcuts.find((shortcut) => shortcut.suits(stream))?.args ?? encode;
}

const VIDEO_SHORTCUTS: readonly Shortcut<VideoStream>[] = [
  {
    suits: (video) =>
      video.codec === COMPATIBLE_VIDEO_CODEC &&
      video.pixelFormat === COMPATIBLE_PIXEL_FORMAT,
    args: COPY_VIDEO,
  },
];

const AUDIO_SHORTCUTS: readonly Shortcut<AudioStream>[] = [
  {
    suits: (audio) => audio.codec === COMPATIBLE_AUDIO_CODEC,
    args: COPY_AUDIO,
  },
];

function audioArguments(
  audio: AudioStream | undefined,
  settings: EncodeSettings,
): readonly string[] {
  return audio === undefined
    ? []
    : treatment(AUDIO_SHORTCUTS, audio, encodeAudio(settings));
}

interface Sound {
  readonly inputs: readonly string[];
  readonly map: string;
  readonly stream: AudioStream | undefined;
}

// Where the sound comes from: a second input when the stream kept it apart,
// otherwise the main input.
function soundOf(main: StreamInfo, audio: StreamInfo | undefined): Sound {
  if (audio === undefined) {
    return {
      inputs: [INPUT_FLAG, INPUT_NAME],
      map: FIRST_AUDIO_STREAM_IF_ANY,
      stream: main.audio,
    };
  }
  return {
    inputs: [INPUT_FLAG, INPUT_NAME, INPUT_FLAG, AUDIO_INPUT_NAME],
    map: SECOND_INPUT_AUDIO_IF_ANY,
    stream: audio.audio,
  };
}

// Streams that already play everywhere are copied as they are, so nothing is
// lost; anything else is re-encoded.
export class ConversionPlanner implements ConversionPlanning {
  constructor(private readonly settings: EncodeSettings) {}

  plan(main: StreamInfo, audio: StreamInfo | undefined): string[] {
    if (main.video === undefined) {
      throw new Error(NO_VIDEO);
    }
    const sound = soundOf(main, audio);
    return [
      ...threads(this.settings),
      ...sound.inputs,
      MAP_FLAG,
      FIRST_VIDEO_STREAM,
      MAP_FLAG,
      sound.map,
      ...treatment(VIDEO_SHORTCUTS, main.video, encodeVideo(this.settings)),
      ...audioArguments(sound.stream, this.settings),
      ...FAST_START,
      OUTPUT_NAME,
    ];
  }
}
