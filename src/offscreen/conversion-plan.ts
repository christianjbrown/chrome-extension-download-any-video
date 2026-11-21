import { CONVERTED_EXTENSION } from "../shared/conversion-messages";
import {
  AUDIO_CODEC_FLAG,
  COMPATIBLE_AUDIO_CODEC,
  COMPATIBLE_PIXEL_FORMAT,
  VIDEO_CODEC_FLAG,
} from "./compatible-format";
import type {
  AudioStream,
  ConversionPlanning,
  EncodeSettings,
  Shortcut,
  Shortcuts,
  StreamInfo,
} from "./conversion-parts";

export const INPUT_NAME = "input";
// A stream's sound, when it came as a separate track.
export const AUDIO_INPUT_NAME = "audio-input";
export const OUTPUT_NAME = `output.${CONVERTED_EXTENSION}`;

// The flag that names an input file, in a plan and when asking about a file.
export const INPUT_FLAG = "-i";
const MAP_FLAG = "-map";

export const NO_VIDEO = "There is no picture in that file, only sound";

const FIRST_VIDEO_STREAM = "0:v:0";
// The trailing ? keeps ffmpeg from refusing a silent video.
const FIRST_AUDIO_STREAM_IF_ANY = "0:a:0?";
const SECOND_INPUT_AUDIO_IF_ANY = "1:a:0?";

// ffmpeg's own flags and values, as its command line spells them.
const THREADS_FLAG = "-threads";
const PRESET_FLAG = "-preset";
const CRF_FLAG = "-crf";
const PIXEL_FORMAT_FLAG = "-pix_fmt";
const PROFILE_FLAG = "-profile:v";
const VIDEO_FILTER_FLAG = "-vf";
const AUDIO_BITRATE_FLAG = "-b:a";
const MOV_FLAGS_FLAG = "-movflags";
const H264_ENCODER = "libx264";
// The index goes at the front of the file, so players start at once.
const FAST_START_FLAG = "+faststart";

const threads = (settings: EncodeSettings): readonly string[] => [
  THREADS_FLAG,
  String(settings.threads),
];

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
const encodeAudio = (settings: EncodeSettings): readonly string[] => [
  AUDIO_CODEC_FLAG,
  COMPATIBLE_AUDIO_CODEC,
  AUDIO_BITRATE_FLAG,
  settings.audioBitrate,
];
const FAST_START: readonly string[] = [MOV_FLAGS_FLAG, FAST_START_FLAG];

// The first shortcut that suits the stream, or a re-encode when none does.
function treatment<S>(
  shortcuts: readonly Shortcut<S>[],
  stream: S,
  encode: readonly string[],
): readonly string[] {
  return shortcuts.find((shortcut) => shortcut.suits(stream))?.args ?? encode;
}

function audioArguments(
  shortcuts: readonly Shortcut<AudioStream>[],
  audio: AudioStream | undefined,
  settings: EncodeSettings,
): readonly string[] {
  return audio === undefined
    ? []
    : treatment(shortcuts, audio, encodeAudio(settings));
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
  constructor(
    private readonly settings: EncodeSettings,
    private readonly shortcuts: Shortcuts,
  ) {}

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
      ...treatment(
        this.shortcuts.video,
        main.video,
        encodeVideo(this.settings),
      ),
      ...audioArguments(this.shortcuts.audio, sound.stream, this.settings),
      ...FAST_START,
      OUTPUT_NAME,
    ];
  }
}
