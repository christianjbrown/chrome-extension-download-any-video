import { PlayerAttributeFinder } from "../../src/page/player-attributes";
import { element, video } from "./fakes";

describe("PlayerAttributeFinder", () => {
  const finder = new PlayerAttributeFinder();

  it("reads video addresses off the player's lineage, JSON escapes and all", () => {
    const clip = video({
      attributes: { poster: "https://cdn.example/poster.jpg" },
    });
    const player = element("my-player", {
      attributes: {
        src: "https://cdn.example/stream/HLSPlaylist.m3u8?a=1&b=2",
        "packaged-media-json":
          '{"playbackMp4s":{"permutations":[{"source":{"url":"https:\\/\\/cdn.example\\/pb\\/m2-res_480p.mp4?m=1\\u0026x=2"}},{"source":{"url":"https://cdn.example/pb/m2-res_720p.mp4?m=1"}}]}}',
      },
      shadow: [clip],
    });
    element("article", {
      attributes: { "data-note": "see https://cdn.example/clip.webm." },
      children: [player],
    });

    expect(finder.find(clip)).toEqual([
      {
        url: "https://cdn.example/stream/HLSPlaylist.m3u8?a=1&b=2",
        origin: "player",
        height: 0,
      },
      {
        url: "https://cdn.example/pb/m2-res_480p.mp4?m=1&x=2",
        origin: "player",
        height: 480,
      },
      {
        url: "https://cdn.example/pb/m2-res_720p.mp4?m=1",
        origin: "player",
        height: 720,
      },
      { url: "https://cdn.example/clip.webm", origin: "player", height: 0 },
    ]);
  });

  it("ignores attributes without a video address", () => {
    const clip = video({ attributes: { class: "player", title: "http://" } });
    element("div", {
      attributes: { href: "https://x.example/page.html" },
      children: [clip],
    });

    expect(finder.find(clip)).toEqual([]);
  });
});
