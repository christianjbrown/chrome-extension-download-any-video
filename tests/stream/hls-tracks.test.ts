import { HlsPlaylistParser } from "../../src/stream/hls-playlist";
import { HlsTracks } from "../../src/stream/hls-tracks";
import { SharpestFirst } from "../../src/stream/sharpest-first";
import { FakeFetcher, hlsTags, refusals } from "./fakes";

const MASTER = "https://cdn.example/v/master.m3u8";
const media = (...names: string[]) =>
  ["#EXTM3U", ...names.flatMap((name) => ["#EXTINF:4,", name]), ""].join("\n");
const piece = (url: string) => ({ url, range: undefined });

describe("HlsTracks", () => {
  it("takes a media playlist as one muxed track", async () => {
    const fetcher = new FakeFetcher({ [MASTER]: media("a.ts", "b.ts") });

    await expect(
      new HlsTracks(
        fetcher,
        new HlsPlaylistParser(hlsTags),
        new SharpestFirst(),
        refusals,
      ).tracks(MASTER),
    ).resolves.toEqual([
      {
        role: "muxed",
        pieces: [
          piece("https://cdn.example/v/a.ts"),
          piece("https://cdn.example/v/b.ts"),
        ],
      },
    ]);
  });

  it("takes the tallest variant of a master playlist, bits deciding a tie", async () => {
    const fetcher = new FakeFetcher({
      [MASTER]:
        "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=1280x720\nlow.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=3000,RESOLUTION=1280x720\nhigh.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=9000,RESOLUTION=640x360\nsmall.m3u8\n",
      "https://cdn.example/v/high.m3u8":
        '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:4,\nseg.m4s\n',
    });

    await expect(
      new HlsTracks(
        fetcher,
        new HlsPlaylistParser(hlsTags),
        new SharpestFirst(),
        refusals,
      ).tracks(MASTER),
    ).resolves.toEqual([
      {
        role: "muxed",
        pieces: [
          piece("https://cdn.example/v/init.mp4"),
          piece("https://cdn.example/v/seg.m4s"),
        ],
      },
    ]);
  });

  it("adds the default sound track when the variant keeps its sound apart", async () => {
    const fetcher = new FakeFetcher({
      [MASTER]:
        '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",URI="en.m3u8"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",DEFAULT=YES,URI="fr.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=3000,RESOLUTION=1280x720,AUDIO="aac"\nvideo.m3u8\n',
      "https://cdn.example/v/video.m3u8": media("v.m4s"),
      "https://cdn.example/v/fr.m3u8": media("fr.m4s"),
    });

    await expect(
      new HlsTracks(
        fetcher,
        new HlsPlaylistParser(hlsTags),
        new SharpestFirst(),
        refusals,
      ).tracks(MASTER),
    ).resolves.toEqual([
      { role: "video", pieces: [piece("https://cdn.example/v/v.m4s")] },
      { role: "audio", pieces: [piece("https://cdn.example/v/fr.m4s")] },
    ]);
  });

  it("takes the first sound track when none is the default", async () => {
    const fetcher = new FakeFetcher({
      [MASTER]:
        '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",URI="en.m3u8"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",URI="fr.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=3000,AUDIO="aac"\nvideo.m3u8\n',
      "https://cdn.example/v/video.m3u8": media("v.m4s"),
      "https://cdn.example/v/en.m3u8": media("en.m4s"),
    });

    const tracks = await new HlsTracks(
      fetcher,
      new HlsPlaylistParser(hlsTags),
      new SharpestFirst(),
      refusals,
    ).tracks(MASTER);

    expect(tracks[1]?.pieces).toEqual([piece("https://cdn.example/v/en.m4s")]);
  });

  it("treats a sound group with nothing to fetch as sound inside the variant", async () => {
    const fetcher = new FakeFetcher({
      [MASTER]:
        '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="x"\n#EXT-X-STREAM-INF:BANDWIDTH=3000,AUDIO="aac"\nvideo.m3u8\n',
      "https://cdn.example/v/video.m3u8": media("v.ts"),
    });

    const tracks = await new HlsTracks(
      fetcher,
      new HlsPlaylistParser(hlsTags),
      new SharpestFirst(),
      refusals,
    ).tracks(MASTER);

    expect(tracks.map((track) => track.role)).toEqual(["muxed"]);
  });

  it.each([
    ["#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\n", refusals.noStreams],
    ["#EXTM3U\n#EXT-X-ENDLIST\n", refusals.emptyPlaylist],
    [
      '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k"\n#EXTINF:4,\na.ts\n',
      refusals.encrypted,
    ],
  ])("says why %j cannot be downloaded", async (text, message) => {
    const fetcher = new FakeFetcher({ [MASTER]: text });

    await expect(
      new HlsTracks(
        fetcher,
        new HlsPlaylistParser(hlsTags),
        new SharpestFirst(),
        refusals,
      ).tracks(MASTER),
    ).rejects.toThrow(message);
  });
});
