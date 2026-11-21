import { HEIGHT_PATTERNS, UrlHeights } from "../../src/shared/url-heights";

describe("UrlHeights", () => {
  const heights = new UrlHeights(HEIGHT_PATTERNS);

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
    expect(heights.heightOf(url)).toBe(height);
  });

  it("looks for the patterns it is given", () => {
    expect(new UrlHeights([/h(\d+)/]).heightOf("https://x/h360.mp4")).toBe(360);
  });
});
