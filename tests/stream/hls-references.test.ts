import { HlsPlaylistParser } from "../../src/stream/hls-playlist";
import { HlsReferences } from "../../src/stream/hls-references";
import { FakeFetcher, hlsTags } from "./fakes";

const MASTER = "https://cdn.example/v/master.m3u8";

describe("HlsReferences", () => {
  it("lists a media playlist's init and segments", async () => {
    const lister = new HlsReferences(
      new FakeFetcher({
        "https://cdn.example/v/index.m3u8": [
          "#EXTM3U",
          '#EXT-X-MAP:URI="init.mp4"',
          "#EXTINF:1,",
          "seg0.m4s",
          "#EXTINF:1,",
          "seg1.m4s",
          "#EXT-X-ENDLIST",
        ].join("\n"),
      }),
      new HlsPlaylistParser(hlsTags),
    );

    await expect(
      lister.references("https://cdn.example/v/index.m3u8"),
    ).resolves.toEqual([
      "https://cdn.example/v/init.mp4",
      "https://cdn.example/v/seg0.m4s",
      "https://cdn.example/v/seg1.m4s",
    ]);
  });

  it("lists every variant and rendition of a master, and all their pieces", async () => {
    const lister = new HlsReferences(
      new FakeFetcher({
        [MASTER]: [
          "#EXTM3U",
          '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="en",URI="audio/index.m3u8"',
          '#EXT-X-STREAM-INF:BANDWIDTH=1,RESOLUTION=640x360,AUDIO="a"',
          "low/index.m3u8",
          '#EXT-X-STREAM-INF:BANDWIDTH=2,RESOLUTION=1280x720,AUDIO="a"',
          "hd/index.m3u8",
        ].join("\n"),
        "https://cdn.example/v/low/index.m3u8": "#EXTM3U\n#EXTINF:1,\nlow0.ts",
        "https://cdn.example/v/hd/index.m3u8": "#EXTM3U\n#EXTINF:1,\nhd0.ts",
        "https://cdn.example/v/audio/index.m3u8":
          '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:1,\na0.m4s',
      }),
      new HlsPlaylistParser(hlsTags),
    );

    await expect(lister.references(MASTER)).resolves.toEqual([
      "https://cdn.example/v/low/index.m3u8",
      "https://cdn.example/v/hd/index.m3u8",
      "https://cdn.example/v/audio/index.m3u8",
      "https://cdn.example/v/low/low0.ts",
      "https://cdn.example/v/hd/hd0.ts",
      "https://cdn.example/v/audio/init.mp4",
      "https://cdn.example/v/audio/a0.m4s",
    ]);
  });
});
