import type { CandidateOrigin, VideoCandidate } from "../shared/candidates";

// Turns the addresses a finder came across into candidates, keeping only the
// ones that are videos.
export interface UrlCandidates {
  candidates(
    urls: readonly string[],
    origin: CandidateOrigin,
  ): VideoCandidate[];
}
