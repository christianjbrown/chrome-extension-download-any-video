import { media } from "../shared/media";
import {
  NOT_A_PLAYLIST,
  PlaylistReader,
  type StreamReader,
} from "../../src/stream/stream-reader";

describe("PlaylistReader", () => {
  const reader = (name: string): StreamReader => ({
    tracks: vi.fn().mockResolvedValue([{ role: name, pieces: [] }]),
  });
  const readers = { hls: reader("hls"), dash: reader("dash") };
  const playlists = new PlaylistReader(readers, media);

  it("hands each format to its own reader", async () => {
    await expect(playlists.tracks("https://x/v.m3u8")).resolves.toEqual([
      { role: "hls", pieces: [] },
    ]);
    await expect(playlists.tracks("https://x/v.mpd?a=1")).resolves.toEqual([
      { role: "dash", pieces: [] },
    ]);
    expect(readers.hls.tracks).toHaveBeenCalledWith("https://x/v.m3u8");
  });

  it("refuses an address that is not a playlist", async () => {
    await expect(playlists.tracks("https://x/v.mp4")).rejects.toThrow(
      NOT_A_PLAYLIST,
    );
  });
});
