import { ByFormat } from "../../src/stream/by-format";
import { media } from "../shared/media";
import { refusals } from "./fakes";

describe("ByFormat", () => {
  const byFormat = new ByFormat(
    media,
    { hls: "hls one", dash: "dash one" },
    refusals,
  );

  it("picks the handler for each format", () => {
    expect(byFormat.handlerFor("https://x/v.m3u8")).toBe("hls one");
    expect(byFormat.handlerFor("https://x/v.mpd?a=1")).toBe("dash one");
  });

  it("refuses an address that is not a playlist", () => {
    expect(() => byFormat.handlerFor("https://x/v.mp4")).toThrow(
      refusals.notAPlaylist,
    );
  });
});
