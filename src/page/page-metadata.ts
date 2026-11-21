import { METADATA_ORIGIN, type VideoCandidate } from "../shared/candidates";
import { heightHint, mediaKind } from "../shared/media-urls";
import type { ElementTree } from "./dom";

export interface PageMetadata {
  find(tree: ElementTree): VideoCandidate[];
}

export type JsonParser = (text: string) => unknown;

// The meta tags that name a page's video for link previews.
const VIDEO_META = [
  "og:video",
  "og:video:url",
  "og:video:secure_url",
  "twitter:player:stream",
];
const META_SELECTOR = VIDEO_META.map(
  (name) => `meta[property="${name}"], meta[name="${name}"]`,
).join(", ");
const JSON_LD_SELECTOR = 'script[type="application/ld+json"]';
const CONTENT_ATTRIBUTE = "content";
const VIDEO_OBJECT = "VideoObject";
// JSON-LD's key for what kind of thing an object is.
const TYPE_KEY = "@type";
// A tag with no content names no video.
const NO_ADDRESS = "";

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

// A page's own word on what its video is: the Open Graph tags and any
// schema.org VideoObject in its structured data.
export class MetadataFinder implements PageMetadata {
  constructor(private readonly parseJson: JsonParser) {}

  find(tree: ElementTree): VideoCandidate[] {
    const urls: string[] = [];
    for (const meta of tree.querySelectorAll(META_SELECTOR)) {
      urls.push(meta.getAttribute(CONTENT_ATTRIBUTE) ?? NO_ADDRESS);
    }
    for (const script of tree.querySelectorAll(JSON_LD_SELECTOR)) {
      urls.push(...this.contentUrls(script.textContent));
    }
    return urls
      .filter((url) => mediaKind(url) !== undefined)
      .map((url) => ({
        url,
        origin: METADATA_ORIGIN,
        height: heightHint(url),
      }));
  }

  private contentUrls(text: string | null): string[] {
    if (text === null) {
      return [];
    }
    try {
      return videoContentUrls(this.parseJson(text));
    } catch {
      return [];
    }
  }
}

function isVideoObject(value: JsonObject): boolean {
  const type = value[TYPE_KEY];
  return Array.isArray(type)
    ? type.includes(VIDEO_OBJECT)
    : type === VIDEO_OBJECT;
}

// Every VideoObject's contentUrl, wherever it sits in the structured data.
function videoContentUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(videoContentUrls);
  }
  if (!isObject(value)) {
    return [];
  }
  const own =
    isVideoObject(value) && typeof value.contentUrl === "string"
      ? [value.contentUrl]
      : [];
  return [...own, ...Object.values(value).flatMap(videoContentUrls)];
}
