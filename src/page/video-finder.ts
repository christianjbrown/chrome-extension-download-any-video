import type { FrameReport, VideoCandidate } from "../shared/candidates";
import type { InstalledFinder } from "../shared/installed-finder";
import type { CandidateSource } from "./finder-parts";

// Everything this frame can say about its video, from each source in the
// order the entry point lists them, most trustworthy first. Each address
// once, where it was first found.
export class VideoFinder implements InstalledFinder {
  constructor(
    private readonly title: () => string,
    private readonly sources: readonly CandidateSource[],
  ) {}

  find(): FrameReport {
    const candidates = this.sources.flatMap((source) => source.find());
    return { title: this.title(), candidates: unique(candidates) };
  }
}

function unique(candidates: readonly VideoCandidate[]): VideoCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) {
      return false;
    }
    seen.add(candidate.url);
    return true;
  });
}
