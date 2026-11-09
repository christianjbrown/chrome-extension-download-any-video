import { parseManifest } from "../../src/stream/dash-manifest";
import { xml } from "./fakes";

const MPD = "https://cdn.example/v/manifest.mpd";
const piece = (url: string, range?: { offset: number; length: number }) => ({
  url,
  range,
});

describe("parseManifest", () => {
  it("reads whole-file representations with nested base URLs, as a link-sharing site serves them", () => {
    const root = xml("MPD", {
      attributes: { mediaPresentationDuration: "PT12S" },
      children: [
        xml("BaseURL", { text: "https://media.example/clip/" }),
        xml("Period", {
          children: [
            xml("AdaptationSet", {
              attributes: { contentType: "video" },
              children: [
                xml("Representation", {
                  attributes: { id: "v480", bandwidth: "900", height: "480" },
                  children: [
                    xml("BaseURL", { text: " DASH_480.mp4 " }),
                    xml("SegmentBase", { attributes: { indexRange: "0-99" } }),
                  ],
                }),
                xml("Representation", {
                  attributes: { id: "v720", bandwidth: "2000", height: "720" },
                  children: [xml("BaseURL", { text: "DASH_720.mp4" })],
                }),
              ],
            }),
            xml("AdaptationSet", {
              attributes: { mimeType: "audio/mp4" },
              children: [
                xml("Representation", {
                  attributes: { id: "a128", bandwidth: "128000" },
                  children: [xml("BaseURL", { text: "DASH_AUDIO_128.mp4" })],
                }),
              ],
            }),
            xml("AdaptationSet", {
              attributes: { mimeType: "text/vtt" },
              children: [
                xml("Representation", {
                  attributes: { id: "subs" },
                  children: [xml("BaseURL", { text: "subs.vtt" })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(parseManifest(root, MPD)).toEqual({
      live: false,
      encrypted: false,
      representations: [
        {
          role: "video",
          height: 480,
          bandwidth: 900,
          pieces: [piece("https://media.example/clip/DASH_480.mp4")],
        },
        {
          role: "video",
          height: 720,
          bandwidth: 2000,
          pieces: [piece("https://media.example/clip/DASH_720.mp4")],
        },
        {
          role: "audio",
          height: 0,
          bandwidth: 128000,
          pieces: [piece("https://media.example/clip/DASH_AUDIO_128.mp4")],
        },
      ],
    });
  });

  it("expands a set's template for each representation, with the representation's own attributes winning", () => {
    const root = xml("MPD", {
      attributes: { mediaPresentationDuration: "PT8S" },
      children: [
        xml("Period", {
          children: [
            xml("BaseURL", { text: "period/" }),
            xml("AdaptationSet", {
              attributes: { mimeType: "video/mp4" },
              children: [
                xml("SegmentTemplate", {
                  attributes: {
                    initialization: "$RepresentationID$/i.mp4",
                    media: "$RepresentationID$/$Number$.m4s",
                    duration: "4",
                  },
                }),
                xml("Representation", {
                  attributes: { id: "a", bandwidth: "1", height: "360" },
                }),
                xml("Representation", {
                  attributes: { id: "b", bandwidth: "2", height: "720" },
                  children: [
                    xml("SegmentTemplate", {
                      attributes: { media: "$RepresentationID$/x$Number$.m4s" },
                    }),
                  ],
                }),
                xml("Representation", {
                  attributes: { id: "c", bandwidth: "3", height: "1080" },
                  children: [
                    xml("SegmentTemplate", {
                      attributes: { media: "$RepresentationID$/$Time$.m4s" },
                      children: [
                        xml("SegmentTimeline", {
                          children: [xml("S", { attributes: { d: "8" } })],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    const [a, b, c] = parseManifest(root, MPD).representations;

    expect(a?.pieces.map((p) => p.url)).toEqual([
      "https://cdn.example/v/period/a/i.mp4",
      "https://cdn.example/v/period/a/1.m4s",
      "https://cdn.example/v/period/a/2.m4s",
    ]);
    expect(b?.pieces.map((p) => p.url)).toEqual([
      "https://cdn.example/v/period/b/i.mp4",
      "https://cdn.example/v/period/b/x1.m4s",
      "https://cdn.example/v/period/b/x2.m4s",
    ]);
    expect(c?.pieces.map((p) => p.url)).toEqual([
      "https://cdn.example/v/period/c/i.mp4",
      "https://cdn.example/v/period/c/0.m4s",
    ]);
  });

  it("takes a representation's own word on its type when the set has none, and skips one with neither", () => {
    const root = xml("MPD", {
      children: [
        xml("Period", {
          children: [
            xml("AdaptationSet", {
              children: [
                xml("Representation", {
                  attributes: { mimeType: "audio/mp4" },
                }),
                xml("Representation", { attributes: { id: "untyped" } }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(parseManifest(root, MPD).representations).toEqual([
      { role: "audio", height: 0, bandwidth: 0, pieces: [piece(MPD)] },
    ]);
  });

  it("takes a representation's own template and timeline when the set has none, and the period's own length", () => {
    const root = xml("MPD", {
      children: [
        xml("Period", {
          attributes: { duration: "PT6S" },
          children: [
            xml("AdaptationSet", {
              attributes: { contentType: "video" },
              children: [
                xml("Representation", {
                  attributes: { id: "a", bandwidth: "1", height: "360" },
                  children: [
                    xml("SegmentTemplate", {
                      attributes: { media: "$Number$.m4s", duration: "2" },
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(
      parseManifest(root, MPD).representations[0]?.pieces.map((p) => p.url),
    ).toEqual([
      "https://cdn.example/v/1.m4s",
      "https://cdn.example/v/2.m4s",
      "https://cdn.example/v/3.m4s",
    ]);
  });

  it("reads a segment list, with byte ranges", () => {
    const root = xml("MPD", {
      children: [
        xml("Period", {
          children: [
            xml("AdaptationSet", {
              attributes: { contentType: "video" },
              children: [
                xml("BaseURL", { text: "set/" }),
                xml("SegmentList", {
                  children: [
                    xml("Initialization", {
                      attributes: { sourceURL: "all.mp4", range: "0-99" },
                    }),
                    xml("SegmentURL", {
                      attributes: { media: "all.mp4", mediaRange: "100-249" },
                    }),
                    xml("SegmentURL", { attributes: { media: "s2.m4s" } }),
                    xml("SegmentURL", { attributes: { mediaRange: "0-9" } }),
                  ],
                }),
                xml("Representation", {
                  attributes: { id: "a", bandwidth: "1" },
                  children: [xml("BaseURL", { text: "rep.mp4" })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(parseManifest(root, MPD).representations[0]?.pieces).toEqual([
      piece("https://cdn.example/v/set/all.mp4", { offset: 0, length: 100 }),
      piece("https://cdn.example/v/set/all.mp4", { offset: 100, length: 150 }),
      piece("https://cdn.example/v/set/s2.m4s"),
      piece("https://cdn.example/v/set/rep.mp4", { offset: 0, length: 10 }),
    ]);
  });

  it("reads a representation's own segment list without an initialisation", () => {
    const root = xml("MPD", {
      children: [
        xml("Period", {
          children: [
            xml("AdaptationSet", {
              attributes: { contentType: "audio" },
              children: [
                xml("Representation", {
                  attributes: { id: "a", bandwidth: "1" },
                  children: [
                    xml("SegmentList", {
                      children: [
                        xml("SegmentURL", { attributes: { media: "a1.m4s" } }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(parseManifest(root, MPD).representations[0]).toEqual({
      role: "audio",
      height: 0,
      bandwidth: 1,
      pieces: [piece("https://cdn.example/v/a1.m4s")],
    });
  });

  it("notices a live manifest and protected content, and a manifest with no period", () => {
    const protectedRoot = xml("MPD", {
      attributes: { type: "dynamic" },
      children: [
        xml("Period", {
          children: [
            xml("AdaptationSet", {
              children: [xml("ContentProtection")],
            }),
          ],
        }),
      ],
    });

    expect(parseManifest(protectedRoot, MPD)).toEqual({
      live: true,
      encrypted: true,
      representations: [],
    });
    expect(parseManifest(xml("MPD"), MPD)).toEqual({
      live: false,
      encrypted: false,
      representations: [],
    });
  });
});
