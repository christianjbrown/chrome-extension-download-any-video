import type { VideoCandidate } from "../../src/shared/candidates";
import { VideoFinder } from "../../src/page/video-finder";

const candidate = (
  url: string,
  origin: VideoCandidate["origin"],
): VideoCandidate => ({
  url,
  origin,
  height: 0,
});

const source = (...found: VideoCandidate[]) => ({
  find: vi.fn().mockReturnValue(found),
});

describe("VideoFinder", () => {
  it("reports every source in order, each address once", () => {
    const finder = new VideoFinder(
      () => "A Page",
      [
        source(
          candidate("https://cdn.example/first.mp4", "element"),
          candidate("https://cdn.example/player.mp4", "player"),
        ),
        source(candidate("https://cdn.example/og.mp4", "metadata")),
        source(
          candidate("https://cdn.example/og.mp4", "network"),
          candidate("https://cdn.example/net.mp4", "network"),
        ),
      ],
    );

    expect(finder.find()).toEqual({
      title: "A Page",
      candidates: [
        candidate("https://cdn.example/first.mp4", "element"),
        candidate("https://cdn.example/player.mp4", "player"),
        candidate("https://cdn.example/og.mp4", "metadata"),
        candidate("https://cdn.example/net.mp4", "network"),
      ],
    });
  });

  it("reports only the title when no source names anything", () => {
    const finder = new VideoFinder(() => "Empty", [source()]);

    expect(finder.find()).toEqual({ title: "Empty", candidates: [] });
  });
});
