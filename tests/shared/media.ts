import { ExtensionMedia } from "../../src/shared/extension-media";
import { MEDIA_EXTENSIONS } from "../../src/shared/media-extensions";
import { HEIGHT_PATTERNS } from "../../src/shared/height-patterns";
import { UrlHeights } from "../../src/shared/url-heights";

// The extension's own reading of URLs, which the tests' addresses are written for.
export const media = new ExtensionMedia(MEDIA_EXTENSIONS);
export const heights = new UrlHeights(HEIGHT_PATTERNS);
