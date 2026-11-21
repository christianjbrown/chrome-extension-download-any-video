import { candidates } from "./candidates";
import { NetworkFinder } from "../../src/page/network-entries";

describe("NetworkFinder", () => {
  it("keeps the video files and playlists the page fetched", () => {
    const finder = new NetworkFinder(
      () => [
        "https://cdn.example/app.js",
        "https://cdn.example/v/DASH_720.mp4?source=fallback",
        "https://cdn.example/v/HLSPlaylist.m3u8",
        "https://cdn.example/poster.png",
      ],
      candidates,
    );

    expect(finder.find()).toEqual([
      {
        url: "https://cdn.example/v/DASH_720.mp4?source=fallback",
        origin: "network",
        height: 720,
      },
      {
        url: "https://cdn.example/v/HLSPlaylist.m3u8",
        origin: "network",
        height: 0,
      },
    ]);
  });
});
