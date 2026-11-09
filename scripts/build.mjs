// Bundles the service worker, the page script and the offscreen document, puts
// ffmpeg.wasm beside them, and copies the static files into dist/, which is the
// folder Chrome loads with "Load unpacked".
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outdir = "dist";
// The multi-threaded core: its ESM entry sits beside its wasm and its worker.
const coreDir = dirname(fileURLToPath(import.meta.resolve("@ffmpeg/core-mt")));
const coreFiles = [
  "ffmpeg-core.js",
  "ffmpeg-core.wasm",
  "ffmpeg-core.worker.js",
];

await rm(outdir, { recursive: true, force: true });
await mkdir(join(outdir, "ffmpeg"), { recursive: true });
await build({
  entryPoints: {
    background: "src/background/main.ts",
    page: "src/page/main.ts",
    offscreen: "src/offscreen/main.ts",
    // The worker @ffmpeg/ffmpeg talks to, bundled so the extension can host it.
    "ffmpeg-worker": "node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js",
  },
  outdir,
  bundle: true,
  format: "iife",
  target: "chrome126",
  minify: false,
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
});
for (const file of coreFiles) {
  await cp(join(coreDir, file), join(outdir, "ffmpeg", file));
}
await cp("static", outdir, { recursive: true });
