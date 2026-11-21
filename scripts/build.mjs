// Bundles the service worker, the page script and the offscreen document, puts
// ffmpeg.wasm beside them, and copies the static files into dist/, which is the
// folder Chrome loads with "Load unpacked".
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import manifest from "../static/manifest.json" with { type: "json" };
// The names live in one file so the code that refers to them can be tested
// against it. The ffmpeg-worker entry is the worker @ffmpeg/ffmpeg talks to,
// bundled so the extension can host it.
import layout from "./layout.json" with { type: "json" };

const { outdir, entryPoints, ffmpegDir, ffmpegCoreFiles } = layout;
// The multi-threaded core: its ESM entry sits beside its wasm and its worker.
const coreDir = dirname(fileURLToPath(import.meta.resolve("@ffmpeg/core-mt")));

await rm(outdir, { recursive: true, force: true });
await mkdir(join(outdir, ffmpegDir), { recursive: true });
await build({
  entryPoints,
  outdir,
  bundle: true,
  format: "iife",
  // The oldest Chrome the manifest lets install the extension.
  target: `chrome${manifest.minimum_chrome_version}`,
  minify: false,
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
});
for (const file of ffmpegCoreFiles) {
  await cp(join(coreDir, file), join(outdir, ffmpegDir, file));
}
await cp("static", outdir, { recursive: true });
