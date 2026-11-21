import { ByFormat } from "../../src/stream/by-format";
import { NOT_A_PLAYLIST } from "../../src/stream/playlists";
import { media } from "../shared/media";

describe("ByFormat", () => {
  const byFormat = new ByFormat(media, { hls: "hls one", dash: "dash one" });

  it("picks the handler for each format", () => {
    expect(byFormat.handlerFor("https://x/v.m3u8")).toBe("hls one");
    expect(byFormat.handlerFor("https://x/v.mpd?a=1")).toBe("dash one");
  });

  it("refuses an address that is not a playlist", () => {
    expect(() => byFormat.handlerFor("https://x/v.mp4")).toThrow(
      NOT_A_PLAYLIST,
    );
  });
});
