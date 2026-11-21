// The parts of the page script's finder, as the finder sees them.
import type { CandidateOrigin, VideoCandidate } from "../shared/candidates";
import type {
  Boxed,
  ElementTree,
  Lineage,
  MetadataElement,
  PlayerElement,
  ScannedElement,
  ShadowHost,
  VideoElement,
} from "./dom";

// Every element of a tree, however the walk gets to them.
export interface ElementWalk {
  all<E extends ShadowHost<E>>(tree: ElementTree<E>): E[];
}

// An element's ancestors, nearest first.
export interface LineageWalk {
  ancestors<E extends Lineage<E>>(element: E): E[];
}

// Turns the addresses a finder came across into candidates, keeping only the
// ones that are videos.
export interface UrlCandidates {
  candidates(
    urls: readonly string[],
    origin: CandidateOrigin,
  ): VideoCandidate[];
}

// What the page has fetched that is a video.
export interface NetworkLog {
  find(): VideoCandidate[];
}

// What the page's metadata names as its video.
export interface PageMetadata {
  find(tree: ElementTree<MetadataElement>): VideoCandidate[];
}

// What the player around a video names on its attributes.
export interface PlayerAttributes {
  find(video: PlayerElement): VideoCandidate[];
}

// A <video> on the page, with the addresses it plays from. A player that feeds
// the element itself (a blob: source) leaves the list empty.
export interface FoundVideo {
  readonly element: VideoElement;
  readonly candidates: readonly VideoCandidate[];
}

// Every <video> on the page, open shadow roots included.
export interface VideoElements {
  find(tree: ElementTree<ScannedElement>): FoundVideo[];
}

// A found video, as far as choosing between them goes: where it is on screen.
export interface Placed {
  readonly element: Boxed;
}

// The one video the person means, of those on the page.
export interface VideoChooser {
  choose<V extends Placed>(videos: readonly V[]): V | undefined;
}
