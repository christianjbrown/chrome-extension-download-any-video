import { CONVERTED_EXTENSION } from "../shared/conversion-messages";
import {
  COMPATIBLE_AUDIO_CODEC,
  COMPATIBLE_PIXEL_FORMAT,
} from "./compatible-format";
import type {
  AudioStream,
  ConversionPlanning,
  EncodeSettings,
  Shortcut,
  Shortcuts,
  StreamInfo,
} from "./conversion-parts";
import {
  AUDIO_BITRATE_FLAG,
  AUDIO_CODEC_FLAG,
  CRF_FLAG,
  EVEN_DIMENSIONS,
  FAST_START_FLAG,
  FIRST_AUDIO_STREAM_IF_ANY,
  FIRST_VIDEO_STREAM,
  H264_ENCODER,
  INPUT_FLAG,
  MAP_FLAG,
  MOV_FLAGS_FLAG,
  PIXEL_FORMAT_FLAG,
  PRESET_FLAG,
  PROFILE_FLAG,
  SECOND_INPUT_AUDIO_IF_ANY,
  THREADS_FLAG,
  VIDEO_CODEC_FLAG,
  VIDEO_FILTER_FLAG,
} from "./ffmpeg-arguments";

export const INPUT_NAME = "input";
// A stream's sound, when it came as a separate track.
export const AUDIO_INPUT_NAME = "audio-input";
export const OUTPUT_NAME = `output.${CONVERTED_EXTENSION}`;

export const NO_VIDEO = "There is no picture in that file, only sound";

const threads = (settings: EncodeSettings): readonly string[] => [
  THREADS_FLAG,
  String(settings.threads),
];

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
  return shortcutFor(shortcuts, stream) ?? encode;
}

function shortcutFor<S>(
  shortcuts: readonly Shortcut<S>[],
  stream: S,
): readonly string[] | undefined {
  return shortcuts.find((shortcut) => shortcut.suits(stream))?.args;
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
