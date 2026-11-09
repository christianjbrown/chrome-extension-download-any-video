import { PieceFetcher } from "../../src/stream/piece-fetcher";
import type { Track } from "../../src/stream/tracks";
import { FakeFetcher, RecordingProgress, decode } from "./fakes";

const pieces = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    url: `https://x/${prefix}${String(i)}`,
    range: i === 0 ? { offset: 10, length: 5 } : undefined,
  }));

describe("PieceFetcher", () => {
  it("fetches every piece of every track in order, a few at a time, saying how far it is", async () => {
    const fetcher = new FakeFetcher();
    const progress = new RecordingProgress();
    const tracks: Track[] = [
      { role: "video", pieces: pieces("v", 6) },
      { role: "audio", pieces: pieces("a", 3) },
    ];

    const fetched = await new PieceFetcher(fetcher).fetchAll(tracks, progress);

    expect(fetched.map((track) => track.role)).toEqual(["video", "audio"]);
    expect(fetched[0]?.parts.map(decode)).toEqual([
      "https://x/v0@10+5",
      "https://x/v1",
      "https://x/v2",
      "https://x/v3",
      "https://x/v4",
      "https://x/v5",
    ]);
    expect(fetched[1]?.parts.map(decode)).toEqual([
      "https://x/a0@10+5",
      "https://x/a1",
      "https://x/a2",
    ]);
    expect(progress.reports).toEqual([
      [0, 9],
      [4, 9],
      [6, 9],
      [9, 9],
    ]);
  });

  it("passes a piece's failure on", async () => {
    const fetcher = new FakeFetcher();
    vi.spyOn(fetcher, "bytes").mockRejectedValue(new Error("HTTP 404"));

    await expect(
      new PieceFetcher(fetcher).fetchAll(
        [{ role: "muxed", pieces: pieces("v", 1) }],
        new RecordingProgress(),
      ),
    ).rejects.toThrow("HTTP 404");
  });
});
