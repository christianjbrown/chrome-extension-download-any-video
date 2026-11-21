import { KindTest } from "../../src/shared/kind-test";
import { media } from "./media";

describe("KindTest", () => {
  it("says yes to a URL of a kind it was given", () => {
    const test = new KindTest(media, new Set(["playlist" as const]));

    expect(test.matches("https://x/v.m3u8")).toBe(true);
    expect(test.matches("https://x/v.mpd")).toBe(true);
  });

  it("says no to a URL of another kind", () => {
    const test = new KindTest(media, new Set(["playlist" as const]));

    expect(test.matches("https://x/a.mp4")).toBe(false);
  });

  it("says no to a URL that is not a video at all", () => {
    const test = new KindTest(
      media,
      new Set(["file" as const, "playlist" as const]),
    );

    expect(test.matches("https://x/page.html")).toBe(false);
  });
});
