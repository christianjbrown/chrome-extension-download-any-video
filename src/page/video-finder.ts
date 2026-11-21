import type { FrameReport, VideoCandidate } from "../shared/candidates";
import type { InstalledFinder } from "../shared/installed-finder";
import type { ElementTree, MetadataElement, ScannedElement } from "./dom";
import type {
  NetworkLog,
  PageMetadata,
  PlayerAttributes,
  VideoChooser,
  VideoElements,
} from "./finder-parts";

export interface FinderParts {
  // The document, read only as the element and metadata finders read it.
  readonly tree: ElementTree<ScannedElement & MetadataElement>;
  readonly title: () => string;
  readonly elements: VideoElements;
  readonly chooser: VideoChooser;
  readonly player: PlayerAttributes;
  readonly metadata: PageMetadata;
  readonly network: NetworkLog;
}

// Everything this frame can say about its video, most trustworthy first: the
// video in view and the player around it, then the page's metadata, then what
// the page fetched. Each address once, where it was first found.
export class VideoFinder implements InstalledFinder {
  constructor(private readonly parts: FinderParts) {}

  find(): FrameReport {
    const { tree, title, elements, chooser, player, metadata, network } =
      this.parts;
    const video = chooser.choose(elements.find(tree));
    const candidates: VideoCandidate[] = [];
    if (video !== undefined) {
      candidates.push(...video.candidates, ...player.find(video.element));
    }
    candidates.push(...metadata.find(tree), ...network.find());
    return { title: title(), candidates: unique(candidates) };
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
