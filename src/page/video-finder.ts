import type { FrameReport, VideoCandidate } from "../shared/candidates";
import type { ElementTree } from "./dom";
import type { NetworkLog } from "./network-entries";
import type { PageMetadata } from "./page-metadata";
import type { PlayerAttributes } from "./player-attributes";
import type { VideoChooser } from "./visible-video";
import type { VideoElements } from "./video-elements";

export interface FinderParts {
  readonly tree: ElementTree;
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
export class VideoFinder {
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
