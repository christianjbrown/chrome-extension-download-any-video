import { NETWORK_ORIGIN, type VideoCandidate } from "../shared/candidates";
import { heightHint, mediaKind } from "../shared/media-urls";

export interface NetworkLog {
  find(): VideoCandidate[];
}

// The addresses the page has fetched so far.
export type ResourceUrls = () => readonly string[];

// Whatever video the page itself has loaded, playlists included. The last
// resort: it says what was fetched, not what is showing.
export class NetworkFinder implements NetworkLog {
  constructor(private readonly resources: ResourceUrls) {}

  find(): VideoCandidate[] {
    return this.resources()
      .filter((url) => mediaKind(url) !== undefined)
      .map((url) => ({ url, origin: NETWORK_ORIGIN, height: heightHint(url) }));
  }
}
