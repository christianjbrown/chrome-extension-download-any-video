import { FallbackConverter } from "../../src/background/fallback-converter";
import { ConversionError } from "../../src/background/video-converter";

describe("FallbackConverter", () => {
  it("hands back whatever the real converter made", async () => {
    const source = { url: "blob:x", extension: "mp4", release: vi.fn() };
    const inner = { convert: vi.fn().mockResolvedValue(source) };
    const onProgress = vi.fn();

    await expect(
      new FallbackConverter(inner).convert("https://x/a.webm", onProgress),
    ).resolves.toBe(source);
    expect(inner.convert).toHaveBeenCalledWith("https://x/a.webm", onProgress);
  });

  it("downloads the file as it is when it could not be fetched", async () => {
    const inner = {
      convert: vi.fn().mockRejectedValue(new ConversionError("fetch", "403")),
    };

    const source = await new FallbackConverter(inner).convert(
      "https://x/a.WebM?x=1",
      vi.fn(),
    );

    expect(source.url).toBe("https://x/a.WebM?x=1");
    expect(source.extension).toBe("webm");
    await expect(source.release()).resolves.toBeUndefined();
  });

  it("has nothing to fall back to for a playlist, which is only a list of pieces", async () => {
    const inner = {
      convert: vi
        .fn()
        .mockRejectedValue(new ConversionError("fetch", "encrypted")),
    };

    await expect(
      new FallbackConverter(inner).convert("https://x/v.m3u8", vi.fn()),
    ).rejects.toThrow("encrypted");
  });

  it("passes on every other failure", async () => {
    const inner = {
      convert: vi.fn().mockRejectedValue(new ConversionError("convert", "no")),
    };
    await expect(
      new FallbackConverter(inner).convert("https://x/a.webm", vi.fn()),
    ).rejects.toThrow("no");

    const broken = { convert: vi.fn().mockRejectedValue(new Error("boom")) };
    await expect(
      new FallbackConverter(broken).convert("https://x/a.webm", vi.fn()),
    ).rejects.toThrow("boom");
  });
});
