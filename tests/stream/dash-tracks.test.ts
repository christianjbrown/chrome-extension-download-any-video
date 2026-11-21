import { DashManifestParser } from "../../src/stream/dash-manifest";
import { DashTracks } from "../../src/stream/dash-tracks";
import { SharpestFirst } from "../../src/stream/sharpest-first";
import {
  EMPTY_PLAYLIST,
  ENCRYPTED_STREAM,
  LIVE_STREAM,
  NO_STREAMS,
} from "../../src/stream/tracks";
import type { XmlElement } from "../../src/stream/xml";
import { FakeFetcher, pieceSources, xml } from "./fakes";

const MPD = "https://cdn.example/v/manifest.mpd";

function representation(
  role: string,
  height: number,
  bandwidth: number,
  file: string,
): XmlElement {
  return xml("AdaptationSet", {
    attributes: { contentType: role },
    children: [
      xml("Representation", {
        attributes: {
          id: file,
          height: String(height),
          bandwidth: String(bandwidth),
        },
        children: file === "" ? [] : [xml("BaseURL", { text: file })],
      }),
    ],
  });
}

function manifest(attributes: Record<string, string>, ...sets: XmlElement[]) {
  return xml("MPD", {
    attributes,
    children: [xml("Period", { children: sets })],
  });
}

// The parser hands back whatever root the test chose for the manifest text.
function reader(root: XmlElement) {
  const fetcher = new FakeFetcher({ [MPD]: "<MPD/>" });
  const parse = vi.fn().mockReturnValue(root);
  return {
    parse,
    tracks: new DashTracks(
      fetcher,
      new DashManifestParser({ parse }, pieceSources),
      new SharpestFirst(),
    ),
  };
}

describe("DashTracks", () => {
  it("takes the sharpest picture and the richest sound", async () => {
    const { parse, tracks } = reader(
      manifest(
        {},
        representation("video", 480, 1, "480.mp4"),
        representation("video", 720, 1, "720.mp4"),
        representation("audio", 0, 64, "a64.mp4"),
        representation("audio", 0, 128, "a128.mp4"),
      ),
    );

    await expect(tracks.tracks(MPD)).resolves.toEqual([
      {
        role: "video",
        pieces: [{ url: "https://cdn.example/v/720.mp4", range: undefined }],
      },
      {
        role: "audio",
        pieces: [{ url: "https://cdn.example/v/a128.mp4", range: undefined }],
      },
    ]);
    expect(parse).toHaveBeenCalledWith("<MPD/>");
  });

  it("takes the picture alone when there is no sound", async () => {
    const { tracks } = reader(
      manifest({}, representation("video", 720, 1, "720.mp4")),
    );

    expect((await tracks.tracks(MPD)).map((t) => t.role)).toEqual(["video"]);
  });

  it.each([
    [manifest({ type: "dynamic" }), LIVE_STREAM],
    [
      manifest(
        {},
        xml("AdaptationSet", { children: [xml("ContentProtection")] }),
      ),
      ENCRYPTED_STREAM,
    ],
    [manifest({}, representation("audio", 0, 1, "a.mp4")), NO_STREAMS],
  ])("says why a stream cannot be downloaded: %s", async (root, message) => {
    const { tracks } = reader(root);

    await expect(tracks.tracks(MPD)).rejects.toThrow(message);
  });

  it("refuses a representation with no pieces", async () => {
    const { tracks } = reader(
      xml("MPD", {
        children: [
          xml("Period", {
            children: [
              xml("AdaptationSet", {
                attributes: { contentType: "video" },
                children: [
                  xml("Representation", {
                    attributes: { id: "v", height: "720", bandwidth: "1" },
                    children: [xml("SegmentList")],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );

    await expect(tracks.tracks(MPD)).rejects.toThrow(EMPTY_PLAYLIST);
  });
});
