import type { VideoCandidate } from "../../src/shared/candidates";
import { InViewVideo } from "../../src/page/in-view-video";
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
  const page = tree();
  const parts = {
    elements: { find: vi.fn().mockReturnValue(videos) },
    chooser: { choose: vi.fn().mockReturnValue(videos[0]) },
    player: {
      find: vi
        .fn()
        .mockReturnValue([
          candidate("https://cdn.example/player.mp4", "player"),
        ]),
    },
  };
  const source = new InViewVideo(
    page,
    parts.elements,
    parts.chooser,
    parts.player,
  );
  return { page, parts, source, videos };
}

describe("InViewVideo", () => {
  it("names the chosen video's addresses, then its player's", () => {
    const { page, parts, source, videos } = setup([
      video({ src: "first.mp4" }),
      video({ src: "second.mp4" }),
    ]);

    expect(source.find()).toEqual([
      candidate("https://cdn.example/first.mp4", "element"),
      candidate("https://cdn.example/player.mp4", "player"),
    ]);
    expect(parts.elements.find).toHaveBeenCalledWith(page);
    expect(parts.chooser.choose).toHaveBeenCalledWith(videos);
    expect(parts.player.find).toHaveBeenCalledWith(videos[0]!.element);
  });

  it("names nothing when there is no video element", () => {
    const { parts, source } = setup([]);

    expect(source.find()).toEqual([]);
    expect(parts.player.find).not.toHaveBeenCalled();
  });
});
