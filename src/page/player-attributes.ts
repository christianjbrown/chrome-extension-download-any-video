import type { VideoCandidate } from "../shared/candidates";
import { heightHint, mediaKind } from "../shared/media-urls";
import type { PageElement } from "./dom";
import { ancestors } from "./tree-walk";

export interface PlayerAttributes {
  find(video: PageElement): VideoCandidate[];
}

// Characters that end a URL in an attribute: quotes, brackets, blanks, and the
// backslash that starts a JSON escape.
const URL_PATTERN = /https?:\/\/[^\s"'<>\\`{}|^[\]]+/g;
const JSON_ESCAPED_SLASH = /\\\//g;
const JSON_ESCAPED_AMPERSAND = /\\u0026/g;
const TRAILING_PUNCTUATION = new Set([".", ",", ";", ":", ")"]);

// A player built from custom elements keeps the video's addresses on its
// attributes, often inside JSON, while the <video> inside it plays a blob.
// Every URL with a video extension on the player's lineage is a candidate.
export class PlayerAttributeFinder implements PlayerAttributes {
  find(video: PageElement): VideoCandidate[] {
    const found: VideoCandidate[] = [];
    for (const element of [video, ...ancestors(video)]) {
      for (const attribute of element.attributes) {
        found.push(...this.urlsIn(attribute.value));
      }
    }
    return found;
  }

  private urlsIn(text: string): VideoCandidate[] {
    const plain = text
      .replace(JSON_ESCAPED_SLASH, "/")
      .replace(JSON_ESCAPED_AMPERSAND, "&");
    const found: VideoCandidate[] = [];
    for (const match of plain.matchAll(URL_PATTERN)) {
      const url = withoutTrailingPunctuation(match[0]);
      if (mediaKind(url) !== undefined) {
        found.push({ url, origin: "player", height: heightHint(url) });
      }
    }
    return found;
  }
}

// A URL quoted in prose or JSON can end on the sentence's full stop.
function withoutTrailingPunctuation(url: string): string {
  let end = url.length;
  while (end > 0 && TRAILING_PUNCTUATION.has(url.charAt(end - 1))) {
    end -= 1;
  }
  return url.slice(0, end);
}
