import type { VideoCandidate } from "../shared/candidates";
import type { ElementTree, MetadataElement } from "./dom";
import type { CandidateSource, PageMetadata } from "./finder-parts";

// What this frame's own document names as its video in its metadata.
export class MetadataSource implements CandidateSource {
  constructor(
    private readonly tree: ElementTree<MetadataElement>,
    private readonly metadata: PageMetadata,
  ) {}

  find(): VideoCandidate[] {
    return this.metadata.find(this.tree);
  }
}
