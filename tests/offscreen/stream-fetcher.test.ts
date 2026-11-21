import { StreamFetcher } from "../../src/offscreen/stream-fetcher";
import type { FetchedTrack } from "../../src/stream/fetchers";
import type { Progress } from "../../src/stream/progress";
import type { Track } from "../../src/stream/tracks";
import { refusals } from "../stream/fakes";

const bytes = (...values: number[]) => new Uint8Array(values).buffer;
const tracks: Track[] = [
  { role: "video", pieces: [{ url: "https://x/v.m4s", range: undefined }] },
  { role: "audio", pieces: [{ url: "https://x/a.m4s", range: undefined }] },
];

// The roles the offscreen page is wired with.
const roles = {
  main: new Set(["muxed", "video"] as const),
  audio: new Set(["audio"] as const),
};

function setup(fetched: FetchedTrack[]) {
  const reader = { tracks: vi.fn().mockResolvedValue(tracks) };
  const pieces = {
    fetchAll: vi.fn((_tracks: Track[], progress: Progress) => {
      progress.report(1, 4);
      return Promise.resolve(fetched);
    }),
  };
  return {
    reader,
    pieces,
    fetcher: new StreamFetcher(reader, pieces, roles, refusals),
  };
}

describe("StreamFetcher", () => {
  it("reads the playlist, fetches the pieces and joins each track into one file", async () => {
    const { reader, pieces, fetcher } = setup([
      { role: "video", parts: [bytes(1, 2), bytes(3)] },
      { role: "audio", parts: [bytes(9)] },
    ]);
    const progress = vi.fn();

    const inputs = await fetcher.fetch("https://x/master.m3u8", progress);

    expect(inputs).toEqual({
      main: new Uint8Array([1, 2, 3]),
      audio: new Uint8Array([9]),
    });
    expect(reader.tracks).toHaveBeenCalledWith("https://x/master.m3u8");
    expect(pieces.fetchAll).toHaveBeenCalledWith(tracks, expect.anything());
    expect(progress).toHaveBeenCalledWith(0.25);
  });

  it("hands a muxed track over on its own", async () => {
    const { fetcher } = setup([{ role: "muxed", parts: [bytes(4)] }]);

    await expect(fetcher.fetch("https://x/v.m3u8", vi.fn())).resolves.toEqual({
      main: new Uint8Array([4]),
      audio: undefined,
    });
  });

  it("refuses a stream with sound and no picture", async () => {
    const { fetcher } = setup([{ role: "audio", parts: [bytes(4)] }]);

    await expect(fetcher.fetch("https://x/v.m3u8", vi.fn())).rejects.toThrow(
      refusals.noStreams,
    );
  });
});
