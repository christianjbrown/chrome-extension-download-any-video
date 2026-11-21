import { media } from "../shared/media";
import { PieceFilter } from "../../src/background/piece-filter";
import type { VideoCandidate } from "../../src/shared/candidates";

const c = (url: string, origin: VideoCandidate["origin"] = "network") => ({
  url,
  origin,
  height: 0,
});

describe("PieceFilter", () => {
  it("drops every candidate a playlist on the page points at, query strings aside", async () => {
    const lister = {
      references: vi
        .fn()
        .mockResolvedValue([
          "https://cdn.example/v/init.mp4",
          "https://cdn.example/v/seg0.m4s",
          "https://cdn.example/v/low/index.m3u8",
        ]),
    };
    const filter = new PieceFilter(lister, media);
    const reports = [
      {
        title: "Top",
        candidates: [
          c("https://cdn.example/v/master.m3u8", "element"),
          c("https://cdn.example/v/init.mp4?token=1"),
          c("https://cdn.example/v/low/index.m3u8"),
          c("https://cdn.example/other.mp4"),
        ],
      },
      { title: "Embed", candidates: [c("https://cdn.example/v/seg0.m4s")] },
    ];

    await expect(filter.filter(reports)).resolves.toEqual([
      {
        title: "Top",
        candidates: [
          c("https://cdn.example/v/master.m3u8", "element"),
          c("https://cdn.example/other.mp4"),
        ],
      },
      { title: "Embed", candidates: [] },
    ]);
    expect(lister.references.mock.calls).toEqual([
      ["https://cdn.example/v/master.m3u8"],
      ["https://cdn.example/v/low/index.m3u8"],
    ]);
  });

  it("asks about each distinct playlist once, and keeps what none of them lists", async () => {
    const lister = {
      references: vi.fn().mockResolvedValue(["https://cdn.example/x.ts"]),
    };
    const filter = new PieceFilter(lister, media);
    const reports = [
      {
        title: "Top",
        candidates: [
          c("https://cdn.example/a.m3u8"),
          c("https://cdn.example/a.m3u8", "player"),
          c("https://cdn.example/b.mpd"),
          c("https://cdn.example/whole.mp4"),
        ],
      },
    ];

    await expect(filter.filter(reports)).resolves.toEqual(reports);
    expect(lister.references).toHaveBeenCalledTimes(2);
  });

  it("drops nothing for a playlist it cannot read", async () => {
    const lister = {
      references: vi.fn().mockRejectedValue(new Error("HTTP 403")),
    };
    const filter = new PieceFilter(lister, media);
    const reports = [
      {
        title: "Top",
        candidates: [
          c("https://cdn.example/a.m3u8"),
          c("https://cdn.example/init.mp4"),
        ],
      },
    ];

    await expect(filter.filter(reports)).resolves.toEqual(reports);
  });

  it("compares an address that is not a URL as it is", async () => {
    const lister = { references: vi.fn().mockResolvedValue(["not a url"]) };
    const filter = new PieceFilter(lister, media);
    const reports = [
      {
        title: "Top",
        candidates: [c("https://cdn.example/a.m3u8"), c("not a url")],
      },
    ];

    await expect(filter.filter(reports)).resolves.toEqual([
      { title: "Top", candidates: [c("https://cdn.example/a.m3u8")] },
    ]);
  });
});
