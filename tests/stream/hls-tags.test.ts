import {
  ByteRangeTag,
  KeyTag,
  MapTag,
  MediaTag,
  StreamInfTag,
} from "../../src/stream/hls-tags";

const base = "https://cdn.example/v/master.m3u8";

describe("StreamInfTag", () => {
  it("makes the URI after a variant's line that variant", () => {
    const reading = { baseUrl: base, variants: [], audio: [] };
    const tag = new StreamInfTag();

    tag.read('#EXT-X-STREAM-INF:BANDWIDTH=900,RESOLUTION=640x360,AUDIO="aac"');
    tag.uri("360.m3u8", reading);
    tag.uri("stray.m3u8", reading);

    expect(reading.variants).toEqual([
      {
        url: "https://cdn.example/v/360.m3u8",
        height: 360,
        bandwidth: 900,
        audioGroup: "aac",
      },
    ]);
  });

  it("ignores a URI that no variant line came before", () => {
    const reading = { baseUrl: base, variants: [], audio: [] };

    new StreamInfTag().uri("stray.m3u8", reading);

    expect(reading.variants).toEqual([]);
  });
});

describe("MediaTag", () => {
  it("adds a sound track that has an address of its own", () => {
    const reading = { baseUrl: base, audio: [] };

    new MediaTag().read(
      '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",DEFAULT=YES,URI="audio.m3u8"',
      reading,
    );

    expect(reading.audio).toEqual([
      {
        group: "aac",
        url: "https://cdn.example/v/audio.m3u8",
        isDefault: true,
      },
    ]);
  });

  it("leaves out sound inside the variant, and anything but sound", () => {
    const reading = { baseUrl: base, audio: [] };
    const tag = new MediaTag();

    tag.read('#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac"', reading);
    tag.read('#EXT-X-MEDIA:TYPE=SUBTITLES,URI="subs.m3u8"', reading);

    expect(reading.audio).toEqual([]);
  });
});

describe("KeyTag", () => {
  it("marks the pieces encrypted for any method but none", () => {
    const reading = { encrypted: false };

    new KeyTag().read("#EXT-X-KEY:METHOD=AES-128,URI=k", reading);

    expect(reading.encrypted).toBe(true);
  });

  it("leaves them plain for no encryption", () => {
    const reading = { encrypted: false };

    new KeyTag().read("#EXT-X-KEY:METHOD=NONE", reading);

    expect(reading.encrypted).toBe(false);
  });
});

describe("MapTag", () => {
  it("names the initialisation piece, with its range when it has one", () => {
    const reading = { baseUrl: base, init: undefined };
    const tag = new MapTag();

    tag.read('#EXT-X-MAP:URI="init.mp4",BYTERANGE="100@0"', reading);
    expect(reading.init).toEqual({
      url: "https://cdn.example/v/init.mp4",
      range: { length: 100, offset: 0 },
    });

    tag.read('#EXT-X-MAP:URI="init.mp4"', reading);
    expect(reading.init).toEqual({
      url: "https://cdn.example/v/init.mp4",
      range: undefined,
    });
  });
});

describe("ByteRangeTag", () => {
  const reading = () => ({
    baseUrl: base,
    init: undefined,
    segments: [],
    encrypted: false,
  });

  it("slices the segment that follows, continuing from the last one", () => {
    const media = reading();
    const tag = new ByteRangeTag();

    tag.read("#EXT-X-BYTERANGE:500@100");
    tag.uri("a.ts", media);
    tag.read("#EXT-X-BYTERANGE:200");
    tag.uri("a.ts", media);
    tag.uri("b.ts", media);

    expect(media.segments).toEqual([
      {
        url: "https://cdn.example/v/a.ts",
        range: { length: 500, offset: 100 },
      },
      {
        url: "https://cdn.example/v/a.ts",
        range: { length: 200, offset: 600 },
      },
      { url: "https://cdn.example/v/b.ts", range: undefined },
    ]);
  });
});
