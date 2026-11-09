import {
  CandidateRanker,
  NOTHING_FOUND,
  ONLY_STREAMS,
} from "../../src/background/candidate-ranker";
import type { VideoCandidate } from "../../src/shared/candidates";

const c = (
  url: string,
  origin: VideoCandidate["origin"],
  height = 0,
): VideoCandidate => ({
  url,
  origin,
  height,
});
const report = (...candidates: VideoCandidate[]) => ({
  title: "t",
  candidates,
});

describe("CandidateRanker", () => {
  const ranker = new CandidateRanker();

  it("takes the tallest file the player itself names, over sharper ones elsewhere", () => {
    const best = ranker.pick([
      report(
        c("https://cdn.example/pl.m3u8", "element"),
        c("https://cdn.example/low.mp4", "element", 360),
        c("https://cdn.example/hd.mp4", "player", 720),
        c("https://cdn.example/og-1080p.mp4", "metadata", 1080),
        c("https://cdn.example/net-2160.mp4", "network", 2160),
      ),
    ]);

    expect(best.url).toBe("https://cdn.example/hd.mp4");
  });

  it("among equals keeps the first found", () => {
    const best = ranker.pick([
      report(
        c("https://cdn.example/a.mp4", "element"),
        c("https://cdn.example/b.mp4", "player"),
      ),
    ]);

    expect(best.url).toBe("https://cdn.example/a.mp4");
  });

  it("falls back to the metadata, then the network, across frames", () => {
    expect(
      ranker.pick([
        report(c("https://cdn.example/pl.m3u8", "player")),
        report(
          c("https://cdn.example/og.mp4", "metadata"),
          c("https://cdn.example/n.mp4", "network", 720),
        ),
      ]).url,
    ).toBe("https://cdn.example/og.mp4");
    expect(
      ranker.pick([report(c("https://cdn.example/n.mp4", "network"))]).url,
    ).toBe("https://cdn.example/n.mp4");
  });

  it("says when there is only a stream, and when there is nothing", () => {
    expect(() =>
      ranker.pick([report(c("https://cdn.example/pl.m3u8", "player"))]),
    ).toThrow(ONLY_STREAMS);
    expect(() => ranker.pick([report(), report()])).toThrow(NOTHING_FOUND);
    expect(() => ranker.pick([])).toThrow(NOTHING_FOUND);
  });
});
