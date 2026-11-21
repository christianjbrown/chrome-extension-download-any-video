import {
  ExtensionMedia,
  MEDIA_EXTENSIONS,
} from "../../src/shared/extension-media";
import { HEIGHT_PATTERNS, UrlHeights } from "../../src/shared/url-heights";

// The extension's own reading of URLs, which the tests' addresses are written for.
export const media = new ExtensionMedia(MEDIA_EXTENSIONS);
export const heights = new UrlHeights(HEIGHT_PATTERNS);
