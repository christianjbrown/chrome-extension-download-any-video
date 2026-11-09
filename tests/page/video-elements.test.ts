import { VideoElementFinder } from "../../src/page/video-elements";
import { element, tree, video } from "./fakes";

describe("VideoElementFinder", () => {
  const finder = new VideoElementFinder();

  it("finds a video and the addresses it plays from, the chosen one first", () => {
    const clip = video({
      currentSrc: "https://cdn.example/chosen.mp4",
      src: "https://cdn.example/attr.mp4",
      videoHeight: 480,
      children: [
        element("source", {
          attributes: { src: "https://cdn.example/hd.webm" },
        }),
        element("source", { attributes: { src: "blob:https://x.example/1" } }),
        element("source"),
      ],
    });

    const found = finder.find(tree(element("main", { children: [clip] })));

    expect(found).toHaveLength(1);
    expect(found[0]!.element).toBe(clip);
    expect(found[0]!.candidates).toEqual([
      { url: "https://cdn.example/chosen.mp4", origin: "element", height: 480 },
      { url: "https://cdn.example/attr.mp4", origin: "element", height: 480 },
      { url: "https://cdn.example/hd.webm", origin: "element", height: 0 },
    ]);
  });

  it("finds a video inside a player's shadow root, with no addresses when it plays a blob", () => {
    const clip = video({ currentSrc: "blob:https://x.example/1" });
    const player = element("my-player", { shadow: [clip] });

    const found = finder.find(tree(player));

    expect(found).toEqual([{ element: clip, candidates: [] }]);
  });

  it("finds nothing on a page without video", () => {
    expect(finder.find(tree(element("img")))).toEqual([]);
  });
});
