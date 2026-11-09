import type {
  CandidateOrigin,
  FrameReport,
  VideoCandidate,
} from "../shared/candidates";
import { mediaKind } from "../shared/media-urls";

export interface Ranker {
  // The one to download, or why there is none.
  pick(reports: readonly FrameReport[]): VideoCandidate;
}

export const NOTHING_FOUND = "No video found on this page";
export const ONLY_STREAMS =
  "The video here is streamed in pieces, which this extension cannot stitch together";

// Origins that describe the same thing are weighed together: the player's
// element and its attributes are one video, the metadata is the page's word,
// and the network log is whatever was fetched.
const TIERS: readonly (readonly CandidateOrigin[])[] = [
  ["element", "player"],
  ["metadata"],
  ["network"],
];

// Picks the sharpest whole file from the most trustworthy place that has one.
// The top frame's word comes first, since that is the page the person is on.
export class CandidateRanker implements Ranker {
  pick(reports: readonly FrameReport[]): VideoCandidate {
    const candidates = reports.flatMap((report) => report.candidates);
    const files = candidates.filter((c) => mediaKind(c.url) === "file");
    for (const tier of TIERS) {
      const best = sharpest(files.filter((c) => tier.includes(c.origin)));
      if (best !== undefined) {
        return best;
      }
    }
    throw new Error(candidates.length === 0 ? NOTHING_FOUND : ONLY_STREAMS);
  }
}

// The tallest, and among equals the first found, which is the most trusted.
function sharpest(
  candidates: readonly VideoCandidate[],
): VideoCandidate | undefined {
  return candidates.reduce<VideoCandidate | undefined>(
    (best, candidate) =>
      best === undefined || candidate.height > best.height ? candidate : best,
    undefined,
  );
}
