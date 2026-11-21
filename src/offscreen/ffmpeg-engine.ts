import type { RunResult, TranscodeEngine } from "./conversion-parts";
import { INPUT_FLAG } from "./ffmpeg-arguments";
import type { ProgressListener } from "./progress";

export interface LogLine {
  message: string;
}

export interface ProgressTick {
  progress: number;
}

// The events @ffmpeg/ffmpeg names.
const LOG_EVENT = "log";
const PROGRESS_EVENT = "progress";

const TEXT_NOT_VIDEO = "ffmpeg handed back text instead of a video";

// The slice of @ffmpeg/ffmpeg's FFmpeg class this needs, so tests can fake it.
export interface FfmpegApi {
  readonly loaded: boolean;
  load(config: {
    coreURL: string;
    wasmURL: string;
    workerURL: string;
    classWorkerURL: string;
  }): Promise<boolean>;
  on(event: typeof LOG_EVENT, callback: (event: LogLine) => void): void;
  on(
    event: typeof PROGRESS_EVENT,
    callback: (event: ProgressTick) => void,
  ): void;
  off(event: typeof LOG_EVENT, callback: (event: LogLine) => void): void;
  off(
    event: typeof PROGRESS_EVENT,
    callback: (event: ProgressTick) => void,
  ): void;
  exec(args: string[]): Promise<number>;
  writeFile(path: string, data: Uint8Array): Promise<boolean>;
  readFile(path: string): Promise<Uint8Array | string>;
  deleteFile(path: string): Promise<boolean>;
}

// Where the extension keeps ffmpeg's pieces.
export interface CoreUrls {
  readonly core: string;
  readonly wasm: string;
  readonly worker: string;
  readonly classWorker: string;
}

const NO_PROGRESS = 0;
const ALL_DONE = 1;

function clamp(ratio: number): number {
  return Math.min(Math.max(ratio, NO_PROGRESS), ALL_DONE);
}

// ffmpeg.wasm, loaded from the extension's own files on first use.
export class FfmpegEngine implements TranscodeEngine {
  constructor(
    private readonly ffmpeg: FfmpegApi,
    private readonly urls: CoreUrls,
    // What ffmpeg prints after the real reason, to look past.
    private readonly noise: readonly RegExp[],
  ) {}

  async ready(): Promise<void> {
    if (!this.ffmpeg.loaded) {
      await this.ffmpeg.load({
        coreURL: this.urls.core,
        wasmURL: this.urls.wasm,
        workerURL: this.urls.worker,
        classWorkerURL: this.urls.classWorker,
      });
    }
  }

  async write(name: string, data: Uint8Array): Promise<void> {
    await this.ffmpeg.writeFile(name, data);
  }

  // ffmpeg refuses a command with no output, but describes the input first.
  async describe(name: string): Promise<string[]> {
    const lines: string[] = [];
    const listener = (event: LogLine): void => {
      lines.push(event.message);
    };
    this.ffmpeg.on(LOG_EVENT, listener);
    try {
      await this.ffmpeg.exec([INPUT_FLAG, name]);
    } finally {
      this.ffmpeg.off(LOG_EVENT, listener);
    }
    return lines;
  }

  async run(args: string[], onProgress: ProgressListener): Promise<RunResult> {
    const lines: string[] = [];
    const log = (event: LogLine): void => {
      lines.push(event.message);
    };
    const progress = (event: ProgressTick): void => {
      onProgress(clamp(event.progress));
    };
    this.ffmpeg.on(LOG_EVENT, log);
    this.ffmpeg.on(PROGRESS_EVENT, progress);
    try {
      const code = await this.ffmpeg.exec(args);
      return { code, complaint: this.complaintIn(lines) };
    } finally {
      this.ffmpeg.off(LOG_EVENT, log);
      this.ffmpeg.off(PROGRESS_EVENT, progress);
    }
  }

  private complaintIn(lines: readonly string[]): string | undefined {
    return lines.findLast((line) => !this.isNoise(line))?.trim();
  }

  private isNoise(line: string): boolean {
    return this.noise.some((pattern) => pattern.test(line));
  }

  async read(name: string): Promise<Uint8Array> {
    const data = await this.ffmpeg.readFile(name);
    if (typeof data === "string") {
      throw new Error(TEXT_NOT_VIDEO);
    }
    return data;
  }

  async remove(name: string): Promise<void> {
    try {
      await this.ffmpeg.deleteFile(name);
    } catch {
      // Never written, or already gone: either way it is not there now.
    }
  }
}
