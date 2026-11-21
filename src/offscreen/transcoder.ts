import type {
  ConversionPlanning,
  RunResult,
  StreamInfo,
  StreamInfoParsing,
  TranscodeEngine,
  Transcodes,
} from "./conversion-parts";
import { AUDIO_INPUT_NAME, INPUT_NAME, OUTPUT_NAME } from "./conversion-plan";
import type { Sequencer } from "../shared/sequencer";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";

export interface TranscoderParts {
  readonly engine: TranscodeEngine;
  readonly parser: StreamInfoParsing;
  readonly planner: ConversionPlanning;
  // ffmpeg runs one command at a time, so jobs wait their turn here.
  readonly queue: Sequencer;
}

const SUCCESS = 0;

// The badge tooltip is the only place this is read, so ffmpeg's own reason
// goes in it when there is one.
function gaveUp(run: RunResult): string {
  const why = run.complaint ?? `exit code ${String(run.code)}`;
  return `ffmpeg gave up on the video (${why})`;
}

function checkSucceeded(run: RunResult): void {
  if (run.code !== SUCCESS) {
    throw new Error(gaveUp(run));
  }
}

// Turns the inputs into one H.264 MP4. ffmpeg runs one command at a time, so
// jobs queue up behind each other.
export class Transcoder implements Transcodes {
  constructor(private readonly parts: TranscoderParts) {}

  transcode(
    inputs: MediaInputs,
    onProgress: ProgressListener,
  ): Promise<Uint8Array> {
    return this.parts.queue.run(() => this.convert(inputs, onProgress));
  }

  private async convert(
    inputs: MediaInputs,
    onProgress: ProgressListener,
  ): Promise<Uint8Array> {
    const { engine } = this.parts;
    await engine.ready();
    await this.write(inputs);
    try {
      return await this.run(inputs, onProgress);
    } finally {
      await engine.remove(INPUT_NAME);
      await engine.remove(AUDIO_INPUT_NAME);
      await engine.remove(OUTPUT_NAME);
    }
  }

  private async write(inputs: MediaInputs): Promise<void> {
    const { engine } = this.parts;
    await engine.write(INPUT_NAME, inputs.main);
    if (inputs.audio !== undefined) {
      await engine.write(AUDIO_INPUT_NAME, inputs.audio);
    }
  }

  private async run(
    inputs: MediaInputs,
    onProgress: ProgressListener,
  ): Promise<Uint8Array> {
    const { engine, planner } = this.parts;
    const main = await this.describe(INPUT_NAME);
    const audio = await this.describeAudio(inputs);
    const run = await engine.run(planner.plan(main, audio), onProgress);
    checkSucceeded(run);
    return engine.read(OUTPUT_NAME);
  }

  // The sound is only asked about when it came as a file of its own.
  private describeAudio(inputs: MediaInputs): Promise<StreamInfo | undefined> {
    return inputs.audio === undefined
      ? Promise.resolve(undefined)
      : this.describe(AUDIO_INPUT_NAME);
  }

  private async describe(name: string): Promise<StreamInfo> {
    const { engine, parser } = this.parts;
    return parser.parse(await engine.describe(name));
  }
}
