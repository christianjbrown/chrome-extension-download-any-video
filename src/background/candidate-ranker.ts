import {
  ELEMENT_ORIGIN,
  METADATA_ORIGIN,
  NETWORK_ORIGIN,
  PLAYER_ORIGIN,
  type CandidateOrigin,
  type FrameReport,
  type VideoCandidate,
} from "../shared/candidates";
import {
  FILE_KIND,
  mediaKind,
  PLAYLIST_KIND,
  type MediaKind,
} from "../shared/media-urls";

export interface Ranker {
  // The one to download, or why there is none.
  pick(reports: readonly FrameReport[]): VideoCandidate;
}

export const NOTHING_FOUND = "No video found on this page";

// Which candidates come first: every kind in turn, and within a kind every
// tier of origins in turn, the sharpest of the first tier that has any.
export interface RankingPolicy {
  readonly kinds: readonly MediaKind[];
  readonly tiers: readonly (readonly CandidateOrigin[])[];
}

export const RANKING: RankingPolicy = {
  // A whole file first, since Chrome can save it as it is; a stream only when
  // there is no file, since its pieces have to be fetched and stitched first.
  kinds: [FILE_KIND, PLAYLIST_KIND],
  // Origins that describe the same thing are weighed together: the player's
  // element and its attributes are one video, the metadata is the page's
  // word, and the network log is whatever was fetched.
  tiers: [[ELEMENT_ORIGIN, PLAYER_ORIGIN], [METADATA_ORIGIN], [NETWORK_ORIGIN]],
};

// Picks the sharpest video from the most trustworthy place that has one.
// The top frame's word comes first, since that is the page the person is on.
export class CandidateRanker implements Ranker {
  constructor(private readonly policy: RankingPolicy) {}

  pick(reports: readonly FrameReport[]): VideoCandidate {
    const candidates = reports.flatMap((report) => report.candidates);
    for (const kind of this.policy.kinds) {
      const best = mostTrusted(
        candidates.filter((c) => mediaKind(c.url) === kind),
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
