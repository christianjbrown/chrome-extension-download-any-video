import { NETWORK_ORIGIN, type VideoCandidate } from "../shared/candidates";
import type { CandidateSource, UrlCandidates } from "./finder-parts";

// The addresses the page has fetched so far.
export type ResourceUrls = () => readonly string[];

// Whatever video the page itself has loaded, playlists included. The last
// resort: it says what was fetched, not what is showing.
export class NetworkFinder implements CandidateSource {
  constructor(
    private readonly resources: ResourceUrls,
    private readonly found: UrlCandidates,
  ) {}

  find(): VideoCandidate[] {
    return this.found.candidates(this.resources(), NETWORK_ORIGIN);
  }
}
