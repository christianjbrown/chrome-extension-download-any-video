import { PLAYER_ORIGIN, type VideoCandidate } from "../shared/candidates";
import type { PlayerElement } from "./dom";
import type { PlayerAttributes, UrlCandidates } from "./finder-parts";
import { ancestors } from "./tree-walk";

// Characters that end a URL in an attribute: quotes, brackets, blanks, and the
// backslash that starts a JSON escape.
const URL_PATTERN = /https?:\/\/[^\s"'<>\\`{}|^[\]]+/g;
const JSON_ESCAPED_SLASH = /\\\//g;
const SLASH = "/";
const JSON_ESCAPED_AMPERSAND = /\\u0026/g;
const AMPERSAND = "&";
const TRAILING_PUNCTUATION = new Set([".", ",", ";", ":", ")"]);

// A player built from custom elements keeps the video's addresses on its
// attributes, often inside JSON, while the <video> inside it plays a blob.
// Every URL with a video extension on the player's lineage is a candidate.
export class PlayerAttributeFinder implements PlayerAttributes {
  constructor(private readonly found: UrlCandidates) {}

  find(video: PlayerElement): VideoCandidate[] {
    const urls: string[] = [];
    for (const element of [video, ...ancestors(video)]) {
      for (const attribute of element.attributes) {
        urls.push(...urlsIn(attribute.value));
      }
    }
    return this.found.candidates(urls, PLAYER_ORIGIN);
  }
}

function urlsIn(text: string): string[] {
  const plain = text
    .replace(JSON_ESCAPED_SLASH, SLASH)
    .replace(JSON_ESCAPED_AMPERSAND, AMPERSAND);
  return Array.from(plain.matchAll(URL_PATTERN), (match) =>
    withoutTrailingPunctuation(match[0]),
  );
}

// A URL quoted in prose or JSON can end on the sentence's full stop.
function withoutTrailingPunctuation(url: string): string {
  let end = url.length;
  while (end > 0 && TRAILING_PUNCTUATION.has(url.charAt(end - 1))) {
    end -= 1;
  }
  return url.slice(0, end);
}
