import { OFFSCREEN_CONFIG } from "../../src/offscreen/config";

describe("offscreen config", () => {
  it("looks at the colour scheme every second", () => {
    expect(OFFSCREEN_CONFIG.schemeCheckMs).toBe(1000);
  });

  it("fetches four pieces of a stream at once", () => {
    expect(OFFSCREEN_CONFIG.parallelFetches).toBe(4);
  });

  it("re-encodes on four threads, quickly, at a quality that looks like the original", () => {
    expect(OFFSCREEN_CONFIG.encoding).toEqual({
      threads: 4,
      preset: "veryfast",
      crf: 20,
      profile: "high",
      audioBitrate: "160k",
    });
  });
});
