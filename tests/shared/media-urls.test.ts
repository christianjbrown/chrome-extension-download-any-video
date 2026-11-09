import {
  fileExtension,
  heightHint,
  isWebUrl,
  mediaKind,
} from "../../src/shared/media-urls";

describe("mediaKind", () => {
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
    expect(mediaKind(url)).toBe(kind);
  });

  it.each([
    "https://cdn.example/poster.jpg",
    "https://cdn.example/page.html",
    "https://cdn.example/video",
    "https://cdn.example/dir.mp4/",
    "not a url",
    "blob:https://x.example/1234",
  ])("does not take %s for a video", (url) => {
    expect(mediaKind(url)).toBeUndefined();
  });
});

describe("fileExtension", () => {
  it("is the file's own extension, lower case", () => {
    expect(fileExtension("https://cdn.example/Clip.WebM")).toBe("webm");
  });

  it("is nothing for a playlist or a page", () => {
    expect(fileExtension("https://cdn.example/p.m3u8")).toBeUndefined();
    expect(fileExtension("https://cdn.example/p.html")).toBeUndefined();
  });
});

describe("heightHint", () => {
  it.each([
    ["https://cdn.example/m2-res_720p.mp4", 720],
    ["https://cdn.example/clip-1080P.mp4", 1080],
    ["https://cdn.example/clip_1280x720.mp4", 720],
    ["https://cdn.example/x/DASH_480.mp4?source=fallback", 480],
    ["https://cdn.example/x/video-2160.webm", 2160],
    ["https://cdn.example/clip.mp4", 0],
    ["https://cdn.example/clip_1699999999.mp4", 0],
    ["https://cdn.example/clip_9999p.mp4", 0],
    ["https://cdn.example/clip_12p.mp4", 0],
  ])("reads %s as %i tall", (url, height) => {
    expect(heightHint(url)).toBe(height);
  });
});

describe("isWebUrl", () => {
  it("takes http and https only", () => {
    expect(isWebUrl("https://x.example/a.mp4")).toBe(true);
    expect(isWebUrl("HTTP://x.example/a.mp4")).toBe(true);
    expect(isWebUrl("blob:https://x.example/1")).toBe(false);
    expect(isWebUrl("")).toBe(false);
  });
});
