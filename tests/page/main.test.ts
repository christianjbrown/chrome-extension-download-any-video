// Drives the injected page script's wiring through a fake document, end to end.
import {
  FINDER_KEY,
  type InstalledFinder,
} from "../../src/shared/installed-finder";
import { element, tree, video } from "./fakes";

function installPage(roots: ReturnType<typeof element>[]) {
  vi.stubGlobal("document", { ...tree(...roots), title: "A Page" });
  vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 800 });
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([
    { name: "https://cdn.example/v/HLSPlaylist.m3u8" } as PerformanceEntry,
  ]);
}

function installed(): InstalledFinder {
  return (globalThis as unknown as Record<string, InstalledFinder>)[
    FINDER_KEY
  ]!;
}

describe("page script", () => {
  beforeEach(() => {
    vi.resetModules();
    // Cleared again by unstubGlobals once the test is over.
    vi.stubGlobal(FINDER_KEY, undefined);
  });

  it("leaves a finder that reports the page's video", async () => {
    const clip = video({
      currentSrc: "blob:https://x.example/1",
      box: { left: 0, top: 0, width: 600, height: 400 },
    });
    const player = element("my-player", {
      attributes: { "data-src": "https://cdn.example/pb/m2-res_720p.mp4" },
      shadow: [clip],
    });
    installPage([
      element("script", {
        attributes: { type: "application/ld+json" },
        text: '{"@type":"VideoObject","contentUrl":"https://cdn.example/ld.mp4"}',
      }),
      player,
    ]);

    await import("../../src/page/main");

    expect(installed().find()).toEqual({
      title: "A Page",
      candidates: [
        {
          url: "https://cdn.example/pb/m2-res_720p.mp4",
          origin: "player",
          height: 720,
        },
        { url: "https://cdn.example/ld.mp4", origin: "metadata", height: 0 },
        {
          url: "https://cdn.example/v/HLSPlaylist.m3u8",
          origin: "network",
          height: 0,
        },
      ],
    });
  });
});
