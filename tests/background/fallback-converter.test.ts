import {
  CONVERT_STAGE,
  FETCH_STAGE,
  type Stage,
} from "../../src/shared/conversion-messages";
import { FallbackConverter } from "../../src/background/fallback-converter";
import { ConversionError } from "../../src/background/video-converter";
import { media, saveable } from "../shared/media";

const recoverable: readonly Stage[] = [FETCH_STAGE, CONVERT_STAGE];

describe("FallbackConverter", () => {
  it("hands back whatever the real converter made", async () => {
    const source = {
      url: "blob:x",
      extension: "mp4",
      converted: true,
      release: vi.fn(),
    };
    const inner = { convert: vi.fn().mockResolvedValue(source) };
    const onProgress = vi.fn();

    await expect(
      new FallbackConverter(inner, saveable, media, recoverable).convert(
        "https://x/a.webm",
        onProgress,
      ),
    ).resolves.toBe(source);
    expect(inner.convert).toHaveBeenCalledWith("https://x/a.webm", onProgress);
  });

  it.each([
    ["could not be fetched", new ConversionError("fetch", "403")],
    [
      "could not be converted",
      new ConversionError(
        "convert",
        "Invalid data found when processing input",
      ),
    ],
  ])("downloads the file as it is when it %s", async (_what, failure) => {
    const inner = { convert: vi.fn().mockRejectedValue(failure) };

    const source = await new FallbackConverter(
      inner,
      saveable,
      media,
      recoverable,
    ).convert("https://x/a.WebM?x=1", vi.fn());

    expect(source.url).toBe("https://x/a.WebM?x=1");
    expect(source.extension).toBe("webm");
    expect(source.converted).toBe(false);
    await expect(source.release()).resolves.toBeUndefined();
  });

  it("has nothing to fall back to for a playlist, which is only a list of pieces", async () => {
    const inner = {
      convert: vi
        .fn()
        .mockRejectedValue(new ConversionError("fetch", "encrypted")),
    };

    await expect(
      new FallbackConverter(inner, saveable, media, recoverable).convert(
        "https://x/v.m3u8",
        vi.fn(),
      ),
    ).rejects.toThrow("encrypted");
  });

  it("passes on a failure to stitch a stream, which is no file to fall back on", async () => {
    const inner = {
      convert: vi
        .fn()
        .mockRejectedValue(new ConversionError("convert", "no pieces")),
    };

    await expect(
      new FallbackConverter(inner, saveable, media, recoverable).convert(
        "https://x/v.mpd",
        vi.fn(),
      ),
    ).rejects.toThrow("no pieces");
  });

  it("passes on anything that is not a conversion failing", async () => {
    const broken = { convert: vi.fn().mockRejectedValue(new Error("boom")) };

    await expect(
      new FallbackConverter(broken, saveable, media, recoverable).convert(
        "https://x/a.webm",
        vi.fn(),
      ),
    ).rejects.toThrow("boom");
  });

  it("passes on a stage it was not told to recover from", async () => {
    const inner = {
      convert: vi
        .fn()
        .mockRejectedValue(new ConversionError(CONVERT_STAGE, "bad codec")),
    };

    await expect(
      new FallbackConverter(inner, saveable, media, [FETCH_STAGE]).convert(
        "https://x/a.webm",
        vi.fn(),
      ),
    ).rejects.toThrow("bad codec");
  });
});
