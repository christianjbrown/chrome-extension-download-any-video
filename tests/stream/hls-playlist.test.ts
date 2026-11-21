import { HlsPlaylistParser } from "../../src/stream/hls-playlist";

const hls = new HlsPlaylistParser();

const BASE = "https://cdn.example/v/master.m3u8";

const master = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English, please",DEFAULT=NO,URI="audio/en.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="French",DEFAULT=YES,URI="audio/fr.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="muxed",NAME="In the video"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",URI="subs/en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.4d401e,mp4a.40.2"
360/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720,AUDIO="aac"
https://other.example/720/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=64000
audio-only.m3u8
#EXT-X-MEDIA:TYPE=AUDIO,URI="nameless.m3u8"
#EXT-X-STREAM-INF:RESOLUTION=320x180
tiny.m3u8
`;

describe("HlsPlaylistParser.isMaster", () => {
  it("tells a master playlist from a media playlist", () => {
    expect(hls.isMaster(master)).toBe(true);
    expect(hls.isMaster("#EXTM3U\n#EXTINF:4,\nseg0.ts\n")).toBe(false);
  });
});

describe("HlsPlaylistParser.master", () => {
  const parsed = hls.master(master, BASE);

  it("ignores an address that no variant line came before", () => {
    const stray = hls.master(
      "#EXTM3U\nstray.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1\nreal.m3u8\n",
      BASE,
    );

    expect(stray.variants.map((variant) => variant.url)).toEqual([
      "https://cdn.example/v/real.m3u8",
    ]);
  });

  it("lists the variants with their size, bits and sound group, resolved against the playlist", () => {
    expect(parsed.variants).toEqual([
      {
        url: "https://cdn.example/v/360/index.m3u8",
        height: 360,
        bandwidth: 800000,
        audioGroup: undefined,
      },
      {
        url: "https://other.example/720/index.m3u8",
        height: 720,
        bandwidth: 2800000,
        audioGroup: "aac",
      },
      {
        url: "https://cdn.example/v/audio-only.m3u8",
        height: 0,
        bandwidth: 64000,
        audioGroup: undefined,
      },
      {
        url: "https://cdn.example/v/tiny.m3u8",
        height: 180,
        bandwidth: 0,
        audioGroup: undefined,
      },
    ]);
  });

  it("lists the sound tracks fetched on their own, and skips the rest", () => {
    expect(parsed.audio).toEqual([
      {
        group: "aac",
        url: "https://cdn.example/v/audio/en.m3u8",
        isDefault: false,
      },
      {
        group: "aac",
        url: "https://cdn.example/v/audio/fr.m3u8",
        isDefault: true,
      },
      {
        group: "",
        url: "https://cdn.example/v/nameless.m3u8",
        isDefault: false,
      },
    ]);
  });

  it("finds nothing in an empty playlist", () => {
    expect(hls.master("#EXTM3U\n", BASE)).toEqual({
      variants: [],
      audio: [],
    });
  });
});

describe("HlsPlaylistParser.media", () => {
  const MEDIA = "https://cdn.example/v/720/index.m3u8";

  it("lists the pieces in order, resolved against the playlist", () => {
    const parsed = hls.media(
      "#EXTM3U\r\n#EXT-X-TARGETDURATION:4\r\n#EXTINF:4.0,\r\nseg0.ts\r\n#EXTINF:4.0,\r\n../seg1.ts\r\n#EXTINF:2.5,\r\nhttps://other.example/seg2.ts\r\n#EXT-X-ENDLIST\r\n",
      MEDIA,
    );

    expect(parsed).toEqual({
      init: undefined,
      encrypted: false,
      segments: [
        { url: "https://cdn.example/v/720/seg0.ts", range: undefined },
        { url: "https://cdn.example/v/seg1.ts", range: undefined },
        { url: "https://other.example/seg2.ts", range: undefined },
      ],
    });
  });

  it("puts the initialisation first for fragmented MP4", () => {
    const parsed = hls.media(
      '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:4,\nseg0.m4s\n',
      MEDIA,
    );

    expect(parsed.init).toEqual({
      url: "https://cdn.example/v/720/init.mp4",
      range: undefined,
    });
    expect(parsed.segments).toHaveLength(1);
  });

  it("takes a map without an address as the playlist's own", () => {
    const parsed = hls.media('#EXT-X-MAP:BYTERANGE="9@0"\n', MEDIA);

    expect(parsed.init).toEqual({
      url: MEDIA,
      range: { offset: 0, length: 9 },
    });
  });

  it("reads byte ranges, continuing from the previous piece when no offset is given", () => {
    const parsed = hls.media(
      [
        "#EXTM3U",
        '#EXT-X-MAP:URI="all.mp4",BYTERANGE="700@0"',
        "#EXTINF:4,",
        "#EXT-X-BYTERANGE:1000@700",
        "all.mp4",
        "#EXTINF:4,",
        "#EXT-X-BYTERANGE:500",
        "all.mp4",
        "#EXTINF:4,",
        "other.mp4",
        "#EXTINF:4,",
        "#EXT-X-BYTERANGE:20",
        "other.mp4",
      ].join("\n"),
      MEDIA,
    );

    const all = "https://cdn.example/v/720/all.mp4";
    const other = "https://cdn.example/v/720/other.mp4";
    expect(parsed.init).toEqual({
      url: all,
      range: { offset: 0, length: 700 },
    });
    expect(parsed.segments).toEqual([
      { url: all, range: { offset: 700, length: 1000 } },
      { url: all, range: { offset: 1700, length: 500 } },
      { url: other, range: undefined },
      { url: other, range: { offset: 0, length: 20 } },
    ]);
  });

  it("notices encryption, unless the key says there is none", () => {
    expect(
      hls.media(
        '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k"\n#EXTINF:4,\nseg0.ts\n',
        MEDIA,
      ).encrypted,
    ).toBe(true);
    expect(
      hls.media("#EXTM3U\n#EXT-X-KEY:METHOD=NONE\n#EXTINF:4,\nseg0.ts\n", MEDIA)
        .encrypted,
    ).toBe(false);
  });
});
