// What a conversion request is handled with, as the parts that use them see
// them.
import type {
  ConvertRequest,
  ConvertResponse,
  ProgressReport,
} from "../shared/conversion-messages";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";

// Tells the service worker how far a job has got.
export interface ProgressSender {
  send(report: ProgressReport): void;
}

export interface ObjectUrls {
  // A URL Chrome can download, for bytes this document holds.
  create(data: Uint8Array): string;
}

// One conversion request, start to finish.
export interface ConvertHandling {
  handle(request: ConvertRequest): Promise<ConvertResponse>;
}

// Fetches the video at a URL, a file or a playlist, into memory.
export interface Fetches {
  fetch(url: string, onProgress: ProgressListener): Promise<MediaInputs>;
}

// Turns the fetched inputs into one H.264 MP4.
export interface Transcodes {
  transcode(
    inputs: MediaInputs,
    onProgress: ProgressListener,
  ): Promise<Uint8Array>;
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

// Decides what ffmpeg does with the inputs.
export interface ConversionPlanning {
  // The ffmpeg arguments that turn the inputs into OUTPUT_NAME: the picture
  // from INPUT_NAME, the sound from AUDIO_INPUT_NAME when there is one and
  // otherwise from INPUT_NAME too.
  plan(main: StreamInfo, audio: StreamInfo | undefined): string[];
}

// How one ffmpeg command ended.
export interface RunResult {
  readonly code: number;
  // ffmpeg's last word on what went wrong, when it said anything useful.
  readonly complaint: string | undefined;
}

// ffmpeg, as the transcoder drives it.
export interface TranscodeEngine {
  ready(): Promise<void>;
  write(name: string, data: Uint8Array): Promise<void>;
  // Everything ffmpeg says about the file when asked to read it.
  describe(name: string): Promise<string[]>;
  // Runs one ffmpeg command and gives back its exit code, with its complaint.
  run(args: string[], onProgress: ProgressListener): Promise<RunResult>;
  read(name: string): Promise<Uint8Array>;
  // Forgets the file, whether or not it was there.
  remove(name: string): Promise<void>;
}

// What ffmpeg says a file holds: its picture and its sound, by codec.
export interface VideoStream {
  readonly codec: string;
  readonly pixelFormat: string;
}

export interface AudioStream {
  readonly codec: string;
}

export interface StreamInfo {
  readonly video?: VideoStream;
  readonly audio?: AudioStream;
}

// Reads what ffmpeg prints about a file.
export interface StreamInfoParsing {
  parse(lines: readonly string[]): StreamInfo;
}
