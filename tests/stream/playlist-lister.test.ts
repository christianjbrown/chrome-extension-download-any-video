import { PlaylistLister } from "../../src/stream/playlist-lister";
import type { FormatChoice, StreamLister } from "../../src/stream/playlists";

describe("PlaylistLister", () => {
  it("asks the lister chosen for the address", async () => {
    const chosen: StreamLister = {
      references: vi.fn().mockResolvedValue(["h"]),
    };
    const choice: FormatChoice<StreamLister> = { handlerFor: () => chosen };

    await expect(
      new PlaylistLister(choice).references("https://x/a.m3u8"),
    ).resolves.toEqual(["h"]);
    expect(chosen.references).toHaveBeenCalledWith("https://x/a.m3u8");
  });

  it("refuses, rather than throws, when no lister suits the address", async () => {
    const choice: FormatChoice<StreamLister> = {
      handlerFor: () => {
        throw new Error("not one");
      },
    };

    await expect(
      new PlaylistLister(choice).references("https://x/a.mp4"),
    ).rejects.toThrow("not one");
  });
});
