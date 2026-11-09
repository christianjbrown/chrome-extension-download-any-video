import {
  FfmpegEngine,
  type FfmpegApi,
  type LogLine,
  type ProgressTick,
} from "../../src/offscreen/ffmpeg-engine";

interface Listeners {
  log: ((e: LogLine) => void)[];
  progress: ((e: ProgressTick) => void)[];
}

function fakeFfmpeg(loaded = false) {
  const listeners: Listeners = { log: [], progress: [] };
  const ffmpeg = {
    loaded,
    load: vi.fn().mockResolvedValue(true),
    on: vi.fn((event: "log" | "progress", callback: never) => {
      listeners[event].push(callback);
    }),
    off: vi.fn((event: "log" | "progress", callback: never) => {
      listeners[event].splice(listeners[event].indexOf(callback), 1);
    }),
    exec: vi.fn().mockResolvedValue(0),
    writeFile: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    deleteFile: vi.fn().mockResolvedValue(true),
  };
  return { ffmpeg: ffmpeg as unknown as FfmpegApi & typeof ffmpeg, listeners };
}

const urls = {
  core: "chrome-extension://x/ffmpeg/ffmpeg-core.js",
  wasm: "chrome-extension://x/ffmpeg/ffmpeg-core.wasm",
  worker: "chrome-extension://x/ffmpeg/ffmpeg-core.worker.js",
  classWorker: "chrome-extension://x/ffmpeg-worker.js",
};

describe("FfmpegEngine", () => {
  it("loads the core from the extension's files once", async () => {
    const { ffmpeg } = fakeFfmpeg();
    const engine = new FfmpegEngine(ffmpeg, urls);

    await engine.ready();

    expect(ffmpeg.load).toHaveBeenCalledWith({
      coreURL: urls.core,
      wasmURL: urls.wasm,
      workerURL: urls.worker,
      classWorkerURL: urls.classWorker,
    });
  });

  it("leaves a loaded core alone", async () => {
    const { ffmpeg } = fakeFfmpeg(true);

    await new FfmpegEngine(ffmpeg, urls).ready();

    expect(ffmpeg.load).not.toHaveBeenCalled();
  });

  it("writes files through", async () => {
    const { ffmpeg } = fakeFfmpeg(true);
    const data = new Uint8Array([9]);

    await new FfmpegEngine(ffmpeg, urls).write("input", data);

    expect(ffmpeg.writeFile).toHaveBeenCalledWith("input", data);
  });

  it("collects what ffmpeg says about a file, then stops listening", async () => {
    const { ffmpeg, listeners } = fakeFfmpeg(true);
    ffmpeg.exec.mockImplementation(() => {
      for (const listener of listeners.log) {
        listener({ message: "Input #0, matroska" });
        listener({ message: "  Stream #0:0: Video: vp9" });
      }
      return Promise.resolve(1);
    });

    const lines = await new FfmpegEngine(ffmpeg, urls).describe("input");

    expect(ffmpeg.exec).toHaveBeenCalledWith(["-i", "input"]);
    expect(lines).toEqual(["Input #0, matroska", "  Stream #0:0: Video: vp9"]);
    expect(listeners.log).toEqual([]);
  });

  it("runs a command, passing progress on clamped between 0 and 1", async () => {
    const { ffmpeg, listeners } = fakeFfmpeg(true);
    const seen: number[] = [];
    ffmpeg.exec.mockImplementation(() => {
      for (const listener of listeners.progress) {
        listener({ progress: -0.2 });
        listener({ progress: 0.4 });
        listener({ progress: 1.7 });
      }
      return Promise.resolve(0);
    });

    const run = await new FfmpegEngine(ffmpeg, urls).run(["-i", "input"], (r) =>
      seen.push(r),
    );

    expect(run).toEqual({ code: 0, complaint: undefined });
    expect(seen).toEqual([0, 0.4, 1]);
    expect(listeners.progress).toEqual([]);
    expect(listeners.log).toEqual([]);
  });

  it("keeps ffmpeg's last real complaint, not the counter or the sign-off after it", async () => {
    const { ffmpeg, listeners } = fakeFfmpeg(true);
    ffmpeg.exec.mockImplementation(() => {
      for (const listener of listeners.log) {
        listener({ message: "Stream mapping:" });
        listener({ message: "frame=   12 fps=0.0 q=28.0 size=       0kB" });
        listener({
          message: "[mp4 @ 0x1] Could not find tag for codec vp8 in stream #0",
        });
        listener({ message: "  " });
        listener({ message: "Conversion failed!" });
        listener({ message: "Aborted()" });
      }
      return Promise.resolve(1);
    });

    const run = await new FfmpegEngine(ffmpeg, urls).run(
      ["-i", "input"],
      vi.fn(),
    );

    expect(run).toEqual({
      code: 1,
      complaint: "[mp4 @ 0x1] Could not find tag for codec vp8 in stream #0",
    });
  });

  it("reads a file back as bytes, and refuses text", async () => {
    const { ffmpeg } = fakeFfmpeg(true);
    const engine = new FfmpegEngine(ffmpeg, urls);

    await expect(engine.read("output.mp4")).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );
    ffmpeg.readFile.mockResolvedValue("oops");
    await expect(engine.read("output.mp4")).rejects.toThrow(
      "ffmpeg handed back text instead of a video",
    );
  });

  it("removes a file, and does not mind one that is not there", async () => {
    const { ffmpeg } = fakeFfmpeg(true);
    const engine = new FfmpegEngine(ffmpeg, urls);

    await engine.remove("input");
    ffmpeg.deleteFile.mockRejectedValue(new Error("ENOENT"));
    await engine.remove("output.mp4");

    expect(ffmpeg.deleteFile).toHaveBeenCalledTimes(2);
  });
});
