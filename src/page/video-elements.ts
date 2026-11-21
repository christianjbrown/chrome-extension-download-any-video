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
import { isVideoElement } from "./element-checks";
import type { FoundVideo, VideoElements } from "./finder-parts";
import { allElements } from "./tree-walk";

const SOURCE_SELECTOR = "source";
const SOURCE_ATTRIBUTE = "src";
// A <source> without an address has nothing to offer.
const NO_ADDRESS = "";

export class VideoElementFinder implements VideoElements {
  find(tree: ElementTree<ScannedElement>): FoundVideo[] {
    return allElements(tree)
      .filter(isVideoElement)
      .map((video) => this.describe(video));
  }

  private describe(video: VideoElement): FoundVideo {
    const sources = Array.from(video.querySelectorAll(SOURCE_SELECTOR));
    return {
      element: video,
      candidates: [
        ...this.playing(video),
        ...sources.flatMap((source) => this.source(source)),
      ],
    };
  }

  // currentSrc is what the browser actually chose among the sources.
  private playing(video: VideoElement): VideoCandidate[] {
    return [video.currentSrc, video.src]
      .filter((url) => isWebUrl(url))
      .map((url) => ({
        url,
        origin: ELEMENT_ORIGIN,
        height: video.videoHeight,
      }));
  }

  private source(source: Attributed): VideoCandidate[] {
    const url = addressOf(source);
    return isWebUrl(url)
      ? [{ url, origin: ELEMENT_ORIGIN, height: UNKNOWN_HEIGHT }]
      : [];
  }
}

function addressOf(source: Attributed): string {
  return source.getAttribute(SOURCE_ATTRIBUTE) ?? NO_ADDRESS;
}
