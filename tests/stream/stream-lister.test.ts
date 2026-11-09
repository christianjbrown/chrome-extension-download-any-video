import { NOT_A_PLAYLIST } from "../../src/stream/stream-reader";
import {
  DashReferences,
  HlsReferences,
  PlaylistLister,
} from "../../src/stream/stream-lister";
import { parseXml } from "../../src/stream/xml-parser";
import { FakeFetcher } from "./fakes";

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

describe("DashReferences", () => {
  it("lists the pieces of every representation", async () => {
    const lister = new DashReferences(
      new FakeFetcher({
        "https://cdn.example/d/manifest.mpd": [
          '<MPD type="static">',
          "<Period>",
          '<AdaptationSet contentType="video">',
          '<Representation id="v" bandwidth="1"><BaseURL>DASH_720.mp4</BaseURL></Representation>',
          "</AdaptationSet>",
          '<AdaptationSet contentType="audio">',
          '<Representation id="a" bandwidth="1"><BaseURL>DASH_AUDIO_128.mp4</BaseURL></Representation>',
          "</AdaptationSet>",
          "</Period>",
          "</MPD>",
        ].join(""),
      }),
      parseXml,
    );

    await expect(
      lister.references("https://cdn.example/d/manifest.mpd"),
    ).resolves.toEqual([
      "https://cdn.example/d/DASH_720.mp4",
      "https://cdn.example/d/DASH_AUDIO_128.mp4",
    ]);
  });
});

describe("PlaylistLister", () => {
  it("hands each format to its lister", async () => {
    const lister = new PlaylistLister({
      hls: { references: vi.fn().mockResolvedValue(["h"]) },
      dash: { references: vi.fn().mockResolvedValue(["d"]) },
    });

    await expect(lister.references("https://x/a.m3u8")).resolves.toEqual(["h"]);
    await expect(lister.references("https://x/a.mpd")).resolves.toEqual(["d"]);
  });

  it("refuses an address that is not a playlist", async () => {
    const lister = new PlaylistLister({
      hls: { references: vi.fn() },
      dash: { references: vi.fn() },
    });

    await expect(lister.references("https://x/a.mp4")).rejects.toThrow(
      NOT_A_PLAYLIST,
    );
  });
});
