import { INPUT_NAME, OUTPUT_NAME } from "./conversion-plan";
import type { ConversionPlanning } from "./conversion-plan";
import type { TranscodeEngine } from "./ffmpeg-engine";
import type { ProgressListener } from "./progress";
import type { StreamInfoParsing } from "./stream-info";

export interface Transcodes {
  transcode(
    data: Uint8Array,
    onProgress: ProgressListener,
  ): Promise<Uint8Array>;
}

export interface TranscoderParts {
  readonly engine: TranscodeEngine;
  readonly parser: StreamInfoParsing;
  readonly planner: ConversionPlanning;
}

const SUCCESS = 0;

// Turns one file into an H.264 MP4. ffmpeg runs one command at a time, so
// jobs queue up behind each other.
export class Transcoder implements Transcodes {
  private last: Promise<unknown> = Promise.resolve();

  constructor(private readonly parts: TranscoderParts) {}

  transcode(
    data: Uint8Array,
    onProgress: ProgressListener,
  ): Promise<Uint8Array> {
    const turn = this.last.then(() => this.convert(data, onProgress));
    this.last = turn.catch(() => undefined);
    return turn;
  }

  private async convert(
    data: Uint8Array,
    onProgress: ProgressListener,
  ): Promise<Uint8Array> {
    const { engine, parser, planner } = this.parts;
    await engine.ready();
    await engine.write(INPUT_NAME, data);
    try {
      const info = parser.parse(await engine.describe(INPUT_NAME));
      const code = await engine.run(planner.plan(info), onProgress);
      if (code !== SUCCESS) {
        throw new Error(
          `ffmpeg gave up on the video (exit code ${String(code)})`,
        );
      }
      return await engine.read(OUTPUT_NAME);
    } finally {
      await engine.remove(INPUT_NAME);
      await engine.remove(OUTPUT_NAME);
    }
  }
}
