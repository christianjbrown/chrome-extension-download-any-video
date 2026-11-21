import {
  ELEMENT_ORIGIN,
  UNKNOWN_HEIGHT,
  type VideoCandidate,
} from "../shared/candidates";
import type { AddressTest } from "../shared/address-test";
import type {
  Attributed,
  ElementTree,
  ScannedElement,
  VideoElement,
} from "./dom";
import { isVideoElement } from "./element-checks";
import type { ElementWalk, FoundVideo, VideoElements } from "./finder-parts";

const SOURCE_SELECTOR = "source";
const SOURCE_ATTRIBUTE = "src";
// A <source> without an address has nothing to offer.
const NO_ADDRESS = "";

export class VideoElementFinder implements VideoElements {
  constructor(
    private readonly walk: ElementWalk,
    // The addresses Chrome can download from.
    private readonly fetchable: AddressTest,
  ) {}

  find(tree: ElementTree<ScannedElement>): FoundVideo[] {
    return this.walk
      .all(tree)
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
      .filter((url) => this.fetchable.matches(url))
      .map((url) => ({
        url,
        origin: ELEMENT_ORIGIN,
        height: video.videoHeight,
      }));
  }

  private source(source: Attributed): VideoCandidate[] {
    const url = addressOf(source);
    return this.fetchable.matches(url)
      ? [{ url, origin: ELEMENT_ORIGIN, height: UNKNOWN_HEIGHT }]
      : [];
  }
}

function addressOf(source: Attributed): string {
  return source.getAttribute(SOURCE_ATTRIBUTE) ?? NO_ADDRESS;
}
