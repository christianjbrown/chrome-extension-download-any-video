import type {
  ConversionPlanning,
  RunResult,
  StreamInfo,
  StreamInfoParsing,
  TranscodeEngine,
  Transcodes,
} from "./conversion-parts";
import { AUDIO_INPUT_NAME, INPUT_NAME, OUTPUT_NAME } from "./conversion-plan";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";

export interface TranscoderParts {
  readonly engine: TranscodeEngine;
  readonly parser: StreamInfoParsing;
  readonly planner: ConversionPlanning;
}

const SUCCESS = 0;

// The badge tooltip is the only place this is read, so ffmpeg's own reason
// goes in it when there is one.
function gaveUp(run: RunResult): string {
  const why = run.complaint ?? `exit code ${String(run.code)}`;
  return `ffmpeg gave up on the video (${why})`;
}

// Turns the inputs into one H.264 MP4. ffmpeg runs one command at a time, so
// jobs queue up behind each other.
export class Transcoder implements Transcodes {
  private last: Promise<unknown> = Promise.resolve();

  constructor(private readonly parts: TranscoderParts) {}

  transcode(
    inputs: MediaInputs,
    onProgress: ProgressListener,
  ): Promise<Uint8Array> {
    const turn = this.last.then(() => this.convert(inputs, onProgress));
    this.last = turn.catch(() => undefined);
    return turn;
  }

  private async convert(
    inputs: MediaInputs,
    onProgress: ProgressListener,
  ): Promise<Uint8Array> {
    const { engine, planner } = this.parts;
    await engine.ready();
    await engine.write(INPUT_NAME, inputs.main);
    if (inputs.audio !== undefined) {
      await engine.write(AUDIO_INPUT_NAME, inputs.audio);
    }
    try {
      const main = await this.describe(INPUT_NAME);
      const audio =
        inputs.audio === undefined
          ? undefined
          : await this.describe(AUDIO_INPUT_NAME);
      const run = await engine.run(planner.plan(main, audio), onProgress);
      if (run.code !== SUCCESS) {
        throw new Error(gaveUp(run));
      }
      return await engine.read(OUTPUT_NAME);
    } finally {
      await engine.remove(INPUT_NAME);
      await engine.remove(AUDIO_INPUT_NAME);
      await engine.remove(OUTPUT_NAME);
    }
  }

  private async describe(name: string): Promise<StreamInfo> {
    const { engine, parser } = this.parts;
    return parser.parse(await engine.describe(name));
  }
}
