import { METADATA_ORIGIN, type VideoCandidate } from "../shared/candidates";
import { isRecord } from "../shared/shape";
import type { ElementTree, MetadataElement } from "./dom";
import type { PageMetadata, UrlCandidates } from "./finder-parts";

export type JsonParser = (text: string) => unknown;

// A meta tag can name its kind in either attribute.
const metaSelector = (name: string): string =>
  `meta[property="${name}"], meta[name="${name}"]`;
const SELECTOR_SEPARATOR = ", ";
const JSON_LD_SELECTOR = 'script[type="application/ld+json"]';
const CONTENT_ATTRIBUTE = "content";
const VIDEO_OBJECT = "VideoObject";
// JSON-LD's key for what kind of thing an object is.
const TYPE_KEY = "@type";
// A tag with no content names no video.
const NO_ADDRESS = "";

type JsonObject = Record<string, unknown>;

function metaContent(meta: MetadataElement): string {
  return meta.getAttribute(CONTENT_ATTRIBUTE) ?? NO_ADDRESS;
}

// A page's own word on what its video is: the Open Graph tags and any
// schema.org VideoObject in its structured data.
export class MetadataFinder implements PageMetadata {
  constructor(
    private readonly parseJson: JsonParser,
    private readonly found: UrlCandidates,
    // The meta tags that name a page's video for link previews.
    private readonly videoMeta: readonly string[],
  ) {}

  find(tree: ElementTree<MetadataElement>): VideoCandidate[] {
    const urls = [
      ...Array.from(
        tree.querySelectorAll(
          this.videoMeta.map(metaSelector).join(SELECTOR_SEPARATOR),
        ),
        metaContent,
      ),
      ...Array.from(tree.querySelectorAll(JSON_LD_SELECTOR)).flatMap((script) =>
        this.contentUrls(script.textContent),
      ),
    ];
    return this.found.candidates(urls, METADATA_ORIGIN);
  }

  private contentUrls(text: string | null): string[] {
    return text === null ? [] : this.parsedUrls(text);
  }

  // Structured data that is not JSON names no video.
  private parsedUrls(text: string): string[] {
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

function hasContentUrl(
  value: JsonObject,
): value is JsonObject & { contentUrl: string } {
  return isVideoObject(value) && typeof value.contentUrl === "string";
}

function ownContentUrl(value: JsonObject): string[] {
  return hasContentUrl(value) ? [value.contentUrl] : [];
}

// Every VideoObject's contentUrl, wherever it sits in the structured data.
function videoContentUrls(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap(videoContentUrls)
    : objectContentUrls(value);
}

function objectContentUrls(value: unknown): string[] {
  return isRecord(value)
    ? [
        ...ownContentUrl(value),
        ...Object.values(value).flatMap(videoContentUrls),
      ]
    : [];
}
