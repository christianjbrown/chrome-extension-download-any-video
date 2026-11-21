import { MediaCandidates } from "../../src/page/media-candidates";

describe("MediaCandidates", () => {
  const candidates = new MediaCandidates(
    { kindOf: (url) => (url.endsWith(".mp4") ? "file" : undefined) },
    { heightOf: (url) => url.length },
  );

  it("keeps the videos, in order, with the height each says it is", () => {
    expect(
      candidates.candidates(
        ["https://x/b.mp4", "https://x/a.js", "https://x/aa.mp4"],
        "network",
      ),
    ).toEqual([
      { url: "https://x/b.mp4", origin: "network", height: 15 },
      { url: "https://x/aa.mp4", origin: "network", height: 16 },
    ]);
  });
});
