import { PLAYER_ORIGIN, type VideoCandidate } from "../shared/candidates";
import { trimEndWhere } from "../shared/text-ends";
import type { PlayerElement } from "./dom";
import type {
  LineageWalk,
  PlayerAttributes,
  UrlCandidates,
} from "./finder-parts";

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
  constructor(
    private readonly found: UrlCandidates,
    private readonly lineage: LineageWalk,
  ) {}

  find(video: PlayerElement): VideoCandidate[] {
    const urls = [video, ...this.lineage.ancestors(video)].flatMap(
      attributeUrls,
    );
    return this.found.candidates(urls, PLAYER_ORIGIN);
  }
}

function attributeUrls(element: PlayerElement): string[] {
  return Array.from(element.attributes).flatMap((attribute) =>
    urlsIn(attribute.value),
  );
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
  return trimEndWhere(url, (char) => TRAILING_PUNCTUATION.has(char));
}
