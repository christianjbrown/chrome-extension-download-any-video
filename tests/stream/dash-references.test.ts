import { DashManifestParser } from "../../src/stream/dash-manifest";
import { DashReferences } from "../../src/stream/dash-references";
import { FakeFetcher, pieceSources, xmlReader } from "./fakes";

describe("DashReferences", () => {
  it("lists the pieces of every representation", async () => {
    const lister = new DashReferences(
      new FakeFetcher({
        "https://cdn.example/d/manifest.mpd": [
          '<MPD type="static">',
          "<Period>",
          '<AdaptationSet contentType="video">',
          '<Representation id="v" bandwidth="1"><BaseURL>DASH_720.mp4</BaseURL></Representation>',
          "</AdaptationSet>",
          '<AdaptationSet contentType="audio">',
          '<Representation id="a" bandwidth="1"><BaseURL>DASH_AUDIO_128.mp4</BaseURL></Representation>',
          "</AdaptationSet>",
          "</Period>",
          "</MPD>",
        ].join(""),
      }),
      new DashManifestParser(xmlReader, pieceSources),
    );

    await expect(
      lister.references("https://cdn.example/d/manifest.mpd"),
    ).resolves.toEqual([
      "https://cdn.example/d/DASH_720.mp4",
      "https://cdn.example/d/DASH_AUDIO_128.mp4",
    ]);
  });
});
