import type { ProgressListener } from "./progress";

export interface LogLine {
  message: string;
}

export interface ProgressTick {
  progress: number;
}

// The slice of @ffmpeg/ffmpeg's FFmpeg class this needs, so tests can fake it.
export interface FfmpegApi {
  readonly loaded: boolean;
  load(config: {
    coreURL: string;
    wasmURL: string;
    workerURL: string;
    classWorkerURL: string;
  }): Promise<boolean>;
  on(event: "log", callback: (event: LogLine) => void): void;
  on(event: "progress", callback: (event: ProgressTick) => void): void;
  off(event: "log", callback: (event: LogLine) => void): void;
  off(event: "progress", callback: (event: ProgressTick) => void): void;
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

export interface RunResult {
  readonly code: number;
  // ffmpeg's last word on what went wrong, when it said anything useful.
  readonly complaint: string | undefined;
}

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

const NO_PROGRESS = 0;
const ALL_DONE = 1;

function clamp(ratio: number): number {
  return Math.min(Math.max(ratio, NO_PROGRESS), ALL_DONE);
}

// What ffmpeg prints after the real reason: the running counter, the sign-off
// and the wasm runtime's own exit note.
const NOISE: readonly RegExp[] = [
  /^\s*$/,
  /^(frame|size)=/,
  /^Conversion failed!$/,
  /^Aborted\(/,
];

function complaintIn(lines: readonly string[]): string | undefined {
  return lines
    .findLast((line) => !NOISE.some((pattern) => pattern.test(line)))
    ?.trim();
}

// ffmpeg.wasm, loaded from the extension's own files on first use.
export class FfmpegEngine implements TranscodeEngine {
  constructor(
    private readonly ffmpeg: FfmpegApi,
    private readonly urls: CoreUrls,
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
    this.ffmpeg.on("log", listener);
    try {
      await this.ffmpeg.exec(["-i", name]);
    } finally {
      this.ffmpeg.off("log", listener);
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
    this.ffmpeg.on("log", log);
    this.ffmpeg.on("progress", progress);
    try {
      const code = await this.ffmpeg.exec(args);
      return { code, complaint: complaintIn(lines) };
    } finally {
      this.ffmpeg.off("log", log);
      this.ffmpeg.off("progress", progress);
    }
  }

  async read(name: string): Promise<Uint8Array> {
    const data = await this.ffmpeg.readFile(name);
    if (typeof data === "string") {
      throw new Error("ffmpeg handed back text instead of a video");
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
