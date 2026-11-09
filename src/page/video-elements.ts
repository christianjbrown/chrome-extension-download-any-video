import type { VideoCandidate } from "../shared/candidates";
import { isWebUrl } from "../shared/media-urls";
import type { ElementTree, PageElement, VideoElement } from "./dom";
import { allElements } from "./tree-walk";

// A <video> on the page, with the addresses it plays from. A player that feeds
// the element itself (a blob: source) leaves the list empty.
export interface FoundVideo {
  readonly element: VideoElement;
  readonly candidates: readonly VideoCandidate[];
}

export interface VideoElements {
  find(tree: ElementTree): FoundVideo[];
}

export class VideoElementFinder implements VideoElements {
  find(tree: ElementTree): FoundVideo[] {
    return allElements(tree)
      .filter((element) => element.localName === "video")
      .map((element) => this.describe(element as VideoElement));
  }

  private describe(video: VideoElement): FoundVideo {
    const candidates: VideoCandidate[] = [];
    // currentSrc is what the browser actually chose among the sources.
    for (const url of [video.currentSrc, video.src]) {
      if (isWebUrl(url)) {
        candidates.push({ url, origin: "element", height: video.videoHeight });
      }
    }
    for (const source of video.querySelectorAll("source")) {
      candidates.push(...this.source(source));
    }
    return { element: video, candidates };
  }

  private source(source: PageElement): VideoCandidate[] {
    const url = source.getAttribute("src") ?? "";
    return isWebUrl(url) ? [{ url, origin: "element", height: 0 }] : [];
  }
}
