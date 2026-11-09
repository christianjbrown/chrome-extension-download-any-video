import type { FrameReport } from "./candidates";

// Where the injected page script leaves its finder for the service worker's
// second call to find. Chrome serialises that call, so the service worker
// spells the name out rather than importing it; the tests keep the two equal.
export const FINDER_KEY = "__downloadAnyVideo";

export interface InstalledFinder {
  find(): FrameReport;
}
