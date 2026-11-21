import layout from "../scripts/layout.json";
import {
  FFMPEG_FILES,
  OFFSCREEN_PAGE,
  PAGE_SCRIPT_FILE,
} from "../src/shared/extension-files";
import manifest from "../static/manifest.json";

// What the build writes for each entry point.
const bundles = Object.keys(layout.entryPoints).map((name) => `${name}.js`);

describe("extension files", () => {
  it("names the page script the build writes", () => {
    expect(bundles).toContain(PAGE_SCRIPT_FILE);
  });

  it("names a hidden page whose bundle the build writes", () => {
    expect(bundles).toContain(OFFSCREEN_PAGE.replace(/\.html$/, ".js"));
  });

  it("names the ffmpeg pieces where the build copies them", () => {
    expect([FFMPEG_FILES.core, FFMPEG_FILES.wasm, FFMPEG_FILES.worker]).toEqual(
      layout.ffmpegCoreFiles.map((file) => `${layout.ffmpegDir}/${file}`),
    );
    expect(bundles).toContain(FFMPEG_FILES.classWorker);
  });

  it("starts the service worker the build writes", () => {
    expect(bundles).toContain(manifest.background.service_worker);
  });
});
