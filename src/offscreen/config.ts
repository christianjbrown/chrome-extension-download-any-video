import type { EncodeSettings } from "./conversion-parts";

// Settings for the offscreen document. Only its entry point reads them, and
// hands each one to the part that needs it.
export interface OffscreenConfig {
  // How often to look at the colour scheme, since no change event arrives.
  schemeCheckMs: number;
  // A stream's pieces fetched at once. A player takes one at a time; a few in
  // parallel is quicker and still polite to the server.
  parallelFetches: number;
  // How ffmpeg re-encodes a video that does not already play everywhere.
  encoding: EncodeSettings;
}

export const OFFSCREEN_CONFIG: OffscreenConfig = {
  schemeCheckMs: 1000,
  parallelFetches: 4,
  // Four threads decode and encode fine; veryfast keeps a software encode
  // bearable; CRF 20 looks like the original.
  encoding: {
    threads: 4,
    preset: "veryfast",
    crf: 20,
    profile: "high",
    audioBitrate: "160k",
  },
};
