import {
  ByteRangeTag,
  KeyTag,
  MapTag,
  MediaTag,
  StreamInfTag,
} from "../../src/stream/hls-tags";

const base = "https://cdn.example/v/master.m3u8";

describe("StreamInfTag", () => {
  it("keeps the variant's attributes for the URI that follows", () => {
    const reading = {
      pending: undefined as ReadonlyMap<string, string> | undefined,
    };

    new StreamInfTag().read(
      '#EXT-X-STREAM-INF:BANDWIDTH=900,CODECS="a,b"',
      reading,
    );

    expect(reading.pending).toEqual(
      new Map([
        ["BANDWIDTH", "900"],
        ["CODECS", "a,b"],
      ]),
    );
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
  it("keeps the range for the segment that follows", () => {
    const reading = { pendingRange: undefined as string | undefined };

    new ByteRangeTag().read("#EXT-X-BYTERANGE:500@100", reading);

    expect(reading.pendingRange).toBe("500@100");
  });
});
