// Files of the built extension that the code names. Each is pinned by a test
// to scripts/layout.json, which the build reads, so the two cannot drift.

// The page script, put into every frame of the clicked tab.
export const PAGE_SCRIPT_FILE = "page.js";
// The hidden page, which loads the offscreen bundle.
export const OFFSCREEN_PAGE = "offscreen.html";

// ffmpeg.wasm's pieces, which the build copies in beside the bundles.
export const FFMPEG_FILES = {
  core: "ffmpeg/ffmpeg-core.js",
  wasm: "ffmpeg/ffmpeg-core.wasm",
  worker: "ffmpeg/ffmpeg-core.worker.js",
  classWorker: "ffmpeg-worker.js",
} as const;
