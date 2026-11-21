import type { VideoCandidate } from "../shared/candidates";
import type { ElementTree, ScannedElement } from "./dom";
import type {
  CandidateSource,
  FoundVideo,
  PlayerAttributes,
  VideoChooser,
  VideoElements,
} from "./finder-parts";

// The video the person means and the player around it, the most trustworthy
// source: it says what is showing.
export class InViewVideo implements CandidateSource {
  constructor(
    private readonly tree: ElementTree<ScannedElement>,
    private readonly elements: VideoElements,
    private readonly chooser: VideoChooser,
    private readonly player: PlayerAttributes,
  ) {}

  find(): VideoCandidate[] {
    const video = this.chooser.choose(this.elements.find(this.tree));
    return video === undefined ? [] : this.around(video);
  }

  private around(video: FoundVideo): VideoCandidate[] {
    return [...video.candidates, ...this.player.find(video.element)];
  }
}
