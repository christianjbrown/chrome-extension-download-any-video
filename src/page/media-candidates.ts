import type { CandidateOrigin, VideoCandidate } from "../shared/candidates";
import type { HeightHints, MediaKinds } from "../shared/media-types";
import type { UrlCandidates } from "./finder-parts";

// An address is a candidate when it names a video, as tall as it says it is.
export class MediaCandidates implements UrlCandidates {
  constructor(
    private readonly kinds: MediaKinds,
    private readonly heights: HeightHints,
  ) {}

  candidates(
    urls: readonly string[],
    origin: CandidateOrigin,
  ): VideoCandidate[] {
    return urls
      .filter((url) => this.kinds.kindOf(url) !== undefined)
      .map((url) => ({ url, origin, height: this.heights.heightOf(url) }));
  }
}
