import type {
  CandidateOrigin,
  FrameReport,
  VideoCandidate,
} from "../shared/candidates";
import type { MediaTest } from "../shared/media-types";
import type { Ranker } from "./download-steps";

export const NOTHING_FOUND = "No video found on this page";

// Which candidates come first: every kind in turn, and within a kind every
// tier of origins in turn, the sharpest of the first tier that has any. The
// service worker's entry point says what the order is.
export interface RankingPolicy {
  readonly kinds: readonly MediaTest[];
  readonly tiers: readonly (readonly CandidateOrigin[])[];
}

// Picks the sharpest video from the most trustworthy place that has one.
// The top frame's word comes first, since that is the page the person is on.
export class CandidateRanker implements Ranker {
  constructor(private readonly policy: RankingPolicy) {}

  pick(reports: readonly FrameReport[]): VideoCandidate {
    const candidates = reports.flatMap((report) => report.candidates);
    for (const kind of this.policy.kinds) {
      const best = mostTrusted(
        candidates.filter((c) => kind.matches(c.url)),
        this.policy.tiers,
      );
      if (best !== undefined) {
        return best;
      }
    }
    throw new Error(NOTHING_FOUND);
  }
}

function mostTrusted(
  candidates: readonly VideoCandidate[],
  tiers: RankingPolicy["tiers"],
): VideoCandidate | undefined {
  for (const tier of tiers) {
    const best = sharpest(candidates.filter((c) => tier.includes(c.origin)));
    if (best !== undefined) {
      return best;
    }
  }
  return undefined;
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
