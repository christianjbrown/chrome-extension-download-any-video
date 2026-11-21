import {
  ExtensionMedia,
  MEDIA_EXTENSIONS,
} from "../../src/shared/extension-media";

const media = new ExtensionMedia(MEDIA_EXTENSIONS);

describe("ExtensionMedia.kindOf", () => {
  it.each([
    ["https://cdn.example/clip.mp4", "file"],
    ["https://cdn.example/clip.MP4?token=1", "file"],
    ["https://cdn.example/a/b/clip.webm", "file"],
    ["https://cdn.example/clip.mov", "file"],
    ["https://cdn.example/clip.m4v", "file"],
    ["https://cdn.example/clip.ogv", "file"],
    ["https://cdn.example/clip.mkv", "file"],
    ["https://cdn.example/stream/playlist.m3u8", "playlist"],
    ["https://cdn.example/stream/manifest.mpd?x=1", "playlist"],
  ])("knows %s is a %s", (url, kind) => {
    expect(media.kindOf(url)).toBe(kind);
  });

  it.each([
    "https://cdn.example/poster.jpg",
    "https://cdn.example/page.html",
    "https://cdn.example/video",
    "https://cdn.example/dir.mp4/",
    "not a url",
    "blob:https://x.example/1234",
  ])("does not take %s for a video", (url) => {
    expect(media.kindOf(url)).toBeUndefined();
  });

  it("reads whatever table it is given", () => {
    const own = new ExtensionMedia(
      new Map([["ts", { kind: "file", format: undefined }]]),
    );
    expect(own.kindOf("https://x/a.ts")).toBe("file");
    expect(own.kindOf("https://x/a.mp4")).toBeUndefined();
  });
});

describe("ExtensionMedia.extensionOf", () => {
  it("is the file's own extension, lower case", () => {
    expect(media.extensionOf("https://cdn.example/Clip.WebM")).toBe("webm");
  });

  it("is nothing for a playlist or a page", () => {
    expect(media.extensionOf("https://cdn.example/p.m3u8")).toBeUndefined();
    expect(media.extensionOf("https://cdn.example/p.html")).toBeUndefined();
  });
});

describe("ExtensionMedia.formatOf", () => {
  it("tells HLS from DASH, and neither from a file or a bare path", () => {
    expect(media.formatOf("https://cdn.example/v/index.M3U8?x=1")).toBe("hls");
    expect(media.formatOf("https://cdn.example/v/manifest.mpd")).toBe("dash");
    expect(media.formatOf("https://cdn.example/v/clip.mp4")).toBeUndefined();
    expect(media.formatOf("https://cdn.example/v/stream")).toBeUndefined();
  });
});
