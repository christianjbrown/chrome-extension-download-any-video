import { ConvertHandler } from "../../src/offscreen/convert-handler";

const request = {
  type: "convert",
  jobId: "j1",
  url: "https://x/a.webm",
} as const;

const inputs = { main: new Uint8Array([1]), audio: undefined };

function setup() {
  const parts = {
    fetcher: { fetch: vi.fn().mockResolvedValue(inputs) },
    transcoder: { transcode: vi.fn().mockResolvedValue(new Uint8Array([2])) },
    urls: { create: vi.fn().mockReturnValue("blob:chrome-extension://x/1") },
    progress: { send: vi.fn() },
  };
  return { parts, handler: new ConvertHandler(parts) };
}

describe("ConvertHandler", () => {
  it("fetches, converts and answers with a URL, reporting each stage's progress", async () => {
    const { parts, handler } = setup();
    parts.fetcher.fetch.mockImplementation(
      (_url: string, onProgress: (ratio: number) => void) => {
        onProgress(0.5);
        return Promise.resolve(inputs);
      },
    );
    parts.transcoder.transcode.mockImplementation(
      (_data: Uint8Array, onProgress: (ratio: number) => void) => {
        onProgress(0.25);
        return Promise.resolve(new Uint8Array([2]));
      },
    );

    const response = await handler.handle(request);

    expect(response).toEqual({ ok: true, url: "blob:chrome-extension://x/1" });
    expect(parts.transcoder.transcode).toHaveBeenCalledWith(
      inputs,
      expect.any(Function),
    );
    expect(parts.urls.create).toHaveBeenCalledWith(new Uint8Array([2]));
    expect(parts.progress.send.mock.calls).toEqual([
      [{ type: "progress", jobId: "j1", stage: "fetch", ratio: 0.5 }],
      [{ type: "progress", jobId: "j1", stage: "convert", ratio: 0.25 }],
    ]);
  });

  it("says the fetch failed, in words", async () => {
    const { parts, handler } = setup();
    parts.fetcher.fetch.mockRejectedValue(new Error("The server answered 403"));

    await expect(handler.handle(request)).resolves.toEqual({
      ok: false,
      stage: "fetch",
      message: "The server answered 403",
    });
    expect(parts.transcoder.transcode).not.toHaveBeenCalled();
  });

  it("says the conversion failed, whatever was thrown", async () => {
    const { parts, handler } = setup();
    parts.transcoder.transcode.mockRejectedValue("out of memory");

    await expect(handler.handle(request)).resolves.toEqual({
      ok: false,
      stage: "convert",
      message: "out of memory",
    });
  });
});
