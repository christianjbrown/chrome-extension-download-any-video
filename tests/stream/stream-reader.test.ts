import type { FormatChoice, StreamReader } from "../../src/stream/playlists";
import { PlaylistReader } from "../../src/stream/stream-reader";

describe("PlaylistReader", () => {
  it("asks the reader chosen for the address", async () => {
    const chosen: StreamReader = {
      tracks: vi.fn().mockResolvedValue([{ role: "muxed", pieces: [] }]),
    };
    const choice: FormatChoice<StreamReader> = { handlerFor: () => chosen };

    await expect(
      new PlaylistReader(choice).tracks("https://x/v.m3u8"),
    ).resolves.toEqual([{ role: "muxed", pieces: [] }]);
    expect(chosen.tracks).toHaveBeenCalledWith("https://x/v.m3u8");
  });

  it("refuses, rather than throws, when no reader suits the address", async () => {
    const choice: FormatChoice<StreamReader> = {
      handlerFor: () => {
        throw new Error("not one");
      },
    };

    await expect(
      new PlaylistReader(choice).tracks("https://x/v.mp4"),
    ).rejects.toThrow("not one");
  });
});
