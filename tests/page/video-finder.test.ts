import type { VideoCandidate } from "../../src/shared/candidates";
import { VideoFinder } from "../../src/page/video-finder";
import { tree, video } from "./fakes";

const candidate = (
  url: string,
  origin: VideoCandidate["origin"],
): VideoCandidate => ({
  url,
  origin,
  height: 0,
});

function setup(found: ReturnType<typeof video>[]) {
  const videos = found.map((element) => ({
    element,
    candidates: [candidate(`https://cdn.example/${element.src}`, "element")],
  }));
  const parts = {
    tree: tree(),
    title: () => "A Page",
    elements: { find: vi.fn().mockReturnValue(videos) },
    chooser: { choose: vi.fn().mockReturnValue(videos[0]) },
    player: {
      find: vi
        .fn()
        .mockReturnValue([
          candidate("https://cdn.example/player.mp4", "player"),
          candidate("https://cdn.example/first.mp4", "player"),
        ]),
    },
    metadata: {
      find: vi
        .fn()
        .mockReturnValue([candidate("https://cdn.example/og.mp4", "metadata")]),
    },
    network: {
      find: vi
        .fn()
        .mockReturnValue([
          candidate("https://cdn.example/og.mp4", "network"),
          candidate("https://cdn.example/net.mp4", "network"),
        ]),
    },
  };
  return { parts, finder: new VideoFinder(parts), videos };
}

describe("VideoFinder", () => {
  it("reports the chosen video, its player, the metadata and the network, each address once", () => {
    const { finder, parts, videos } = setup([
      video({ src: "first.mp4" }),
      video({ src: "second.mp4" }),
    ]);

    const report = finder.find();

    expect(parts.chooser.choose).toHaveBeenCalledWith(videos);
    expect(parts.player.find).toHaveBeenCalledWith(videos[0]!.element);
    expect(report).toEqual({
      title: "A Page",
      candidates: [
        candidate("https://cdn.example/first.mp4", "element"),
        candidate("https://cdn.example/player.mp4", "player"),
        candidate("https://cdn.example/og.mp4", "metadata"),
        candidate("https://cdn.example/net.mp4", "network"),
      ],
    });
  });

  it("still reports the page's metadata and network when there is no video element", () => {
    const { finder, parts } = setup([]);

    const report = finder.find();

    expect(parts.player.find).not.toHaveBeenCalled();
    expect(report.candidates.map((found) => found.url)).toEqual([
      "https://cdn.example/og.mp4",
      "https://cdn.example/net.mp4",
    ]);
  });
});
