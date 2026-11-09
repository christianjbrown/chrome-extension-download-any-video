import { templatePieces, UNKNOWN_LENGTH } from "../../src/stream/dash-template";
import { xml } from "./fakes";

const context = {
  representationId: "v720",
  bandwidth: 2000,
  baseUrl: "https://cdn.example/d/",
  periodSeconds: 10,
};
const urls = (pieces: { url: string }[]) => pieces.map((piece) => piece.url);

describe("templatePieces", () => {
  it("counts segments from a fixed duration and the period's length, numbered from startNumber", () => {
    const template = xml("SegmentTemplate", {
      attributes: {
        initialization: "$RepresentationID$/init.mp4",
        media: "$RepresentationID$/$Number%03d$_$Bandwidth$.m4s",
        timescale: "1000",
        duration: "4000",
        startNumber: "5",
      },
    });

    expect(urls(templatePieces(template, context))).toEqual([
      "https://cdn.example/d/v720/init.mp4",
      "https://cdn.example/d/v720/005_2000.m4s",
      "https://cdn.example/d/v720/006_2000.m4s",
      "https://cdn.example/d/v720/007_2000.m4s",
    ]);
  });

  it("follows a timeline, with repeats, gaps and a run to the end, by time or by number", () => {
    const timeline = xml("SegmentTimeline", {
      children: [
        xml("S", { attributes: { t: "0", d: "2", r: "1" } }),
        xml("S", { attributes: { t: "10", d: "3" } }),
        xml("S", { attributes: { d: "4", r: "-1" } }),
      ],
    });
    const byTime = xml("SegmentTemplate", {
      attributes: { media: "t$Time$.m4s", timescale: "2" },
      children: [timeline],
    });
    const byNumber = xml("SegmentTemplate", {
      attributes: { media: "n$Number$$$.m4s", timescale: "2" },
      children: [timeline],
    });

    expect(urls(templatePieces(byTime, context))).toEqual([
      "https://cdn.example/d/t0.m4s",
      "https://cdn.example/d/t2.m4s",
      "https://cdn.example/d/t10.m4s",
      "https://cdn.example/d/t13.m4s",
      "https://cdn.example/d/t17.m4s",
    ]);
    expect(urls(templatePieces(byNumber, context))).toEqual([
      "https://cdn.example/d/n1$.m4s",
      "https://cdn.example/d/n2$.m4s",
      "https://cdn.example/d/n3$.m4s",
      "https://cdn.example/d/n4$.m4s",
      "https://cdn.example/d/n5$.m4s",
    ]);
  });

  it("names only the initialisation when a timeline runs to an end nobody stated", () => {
    const template = xml("SegmentTemplate", {
      attributes: { initialization: "init.mp4" },
      children: [
        xml("SegmentTimeline", {
          children: [xml("S", { attributes: { d: "4", r: "-1" } })],
        }),
      ],
    });

    expect(
      urls(templatePieces(template, { ...context, periodSeconds: undefined })),
    ).toEqual(["https://cdn.example/d/init.mp4"]);
  });

  it("cannot count segments of a fixed duration without the period's length", () => {
    const template = xml("SegmentTemplate", {
      attributes: { media: "$Number$.m4s", duration: "4" },
    });

    expect(() =>
      templatePieces(template, { ...context, periodSeconds: undefined }),
    ).toThrow(UNKNOWN_LENGTH);
  });
});
