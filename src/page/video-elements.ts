import {
  ELEMENT_ORIGIN,
  UNKNOWN_HEIGHT,
  type VideoCandidate,
} from "../shared/candidates";
import { isWebUrl } from "../shared/media-urls";
import type {
  Attributed,
  ElementTree,
  ScannedElement,
  VideoElement,
} from "./dom";
import { allElements } from "./tree-walk";

// A <video> on the page, with the addresses it plays from. A player that feeds
// the element itself (a blob: source) leaves the list empty.
export interface FoundVideo {
  readonly element: VideoElement;
  readonly candidates: readonly VideoCandidate[];
}

export interface VideoElements {
  find(tree: ElementTree<ScannedElement>): FoundVideo[];
}

const VIDEO_TAG = "video";
const SOURCE_SELECTOR = "source";
const SOURCE_ATTRIBUTE = "src";
// A <source> without an address has nothing to offer.
const NO_ADDRESS = "";

export class VideoElementFinder implements VideoElements {
  find(tree: ElementTree<ScannedElement>): FoundVideo[] {
    return allElements(tree)
      .filter((element) => element.localName === VIDEO_TAG)
      .map((element) => this.describe(element as VideoElement));
  }

  private describe(video: VideoElement): FoundVideo {
    const candidates: VideoCandidate[] = [];
    // currentSrc is what the browser actually chose among the sources.
    for (const url of [video.currentSrc, video.src]) {
      if (isWebUrl(url)) {
        candidates.push({
          url,
          origin: ELEMENT_ORIGIN,
          height: video.videoHeight,
        });
      }
    }
    for (const source of video.querySelectorAll(SOURCE_SELECTOR)) {
      candidates.push(...this.source(source));
    }
    return { element: video, candidates };
  }

  private source(source: Attributed): VideoCandidate[] {
    const url = source.getAttribute(SOURCE_ATTRIBUTE) ?? NO_ADDRESS;
    return isWebUrl(url)
      ? [{ url, origin: ELEMENT_ORIGIN, height: UNKNOWN_HEIGHT }]
      : [];
  }
}
