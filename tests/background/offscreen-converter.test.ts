import { OffscreenConverter } from "../../src/background/offscreen-converter";
import { CONVERTED_EXTENSION } from "../../src/shared/converted-format";
import { ConversionError } from "../../src/background/video-converter";

type Listener = (message: unknown) => void;

const converted = { ok: true, url: "blob:chrome-extension://x/1" };

function setup(response: unknown = converted) {
  const listeners: Listener[] = [];
  const runtime = {
    sendMessage: vi.fn().mockResolvedValue(response),
    onMessage: {
      addListener: vi.fn((listener: Listener) => listeners.push(listener)),
      removeListener: vi.fn((listener: Listener) => {
        listeners.splice(listeners.indexOf(listener), 1);
      }),
    },
  };
  const host = {
    open: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
  };
  return {
    runtime,
    host,
    listeners,
    converter: new OffscreenConverter({ host, runtime, nextId: () => "j1" }),
  };
}

describe("OffscreenConverter", () => {
  it("opens the document, asks for the conversion, and keeps the document until released", async () => {
    const { runtime, host, converter } = setup();

    const source = await converter.convert("https://x/a.webm", vi.fn());

    expect(host.open).toHaveBeenCalled();
    expect(runtime.sendMessage).toHaveBeenCalledWith({
      type: "convert",
      jobId: "j1",
      url: "https://x/a.webm",
    });
    expect(source.url).toBe("blob:chrome-extension://x/1");
    expect(source.extension).toBe(CONVERTED_EXTENSION);
    expect(host.release).not.toHaveBeenCalled();
    await source.release();
    expect(host.release).toHaveBeenCalledTimes(1);
  });

  it("passes on this job's progress and nobody else's, then stops listening", async () => {
    const { runtime, listeners, converter } = setup();
    const onProgress = vi.fn();
    runtime.sendMessage.mockImplementation(() => {
      for (const listener of listeners) {
        listener({ type: "progress", jobId: "j1", stage: "fetch", ratio: 0.5 });
        listener({
          type: "progress",
          jobId: "other",
          stage: "convert",
          ratio: 0.9,
        });
        listener("noise");
      }
      return Promise.resolve({ ok: true, url: "blob:x" });
    });

    await converter.convert("https://x/a.webm", onProgress);

    expect(onProgress.mock.calls).toEqual([["fetch", 0.5]]);
    expect(listeners).toEqual([]);
  });

  it("turns a refusal into a ConversionError and lets the document go", async () => {
    const { host, converter } = setup({
      ok: false,
      stage: "convert",
      message: "ffmpeg gave up",
    });

    const failure = converter.convert("https://x/a.webm", vi.fn());

    await expect(failure).rejects.toThrow(ConversionError);
    await expect(failure).rejects.toMatchObject({
      stage: "convert",
      message: "ffmpeg gave up",
    });
    expect(host.release).toHaveBeenCalledTimes(1);
  });

  it("complains when the document gave no answer, and lets it go", async () => {
    const { host, listeners, converter } = setup(null);

    await expect(
      converter.convert("https://x/a.webm", vi.fn()),
    ).rejects.toThrow("The converter gave no answer");
    expect(host.release).toHaveBeenCalledTimes(1);
    expect(listeners).toEqual([]);
  });
});
