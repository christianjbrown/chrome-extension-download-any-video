import { ExtensionMedia } from "../../src/shared/extension-media";
import { KindTest } from "../../src/shared/kind-test";
import { MEDIA_EXTENSIONS } from "../../src/shared/media-extensions";
import { FILE_KIND, PLAYLIST_KIND } from "../../src/shared/media-types";
import { PathExtensions } from "../../src/shared/path-extensions";
import { HEIGHT_PATTERNS } from "../../src/shared/height-patterns";
import { UrlHeights } from "../../src/shared/url-heights";

// The extension's own reading of URLs, which the tests' addresses are written for.
export const media = new ExtensionMedia(MEDIA_EXTENSIONS);
// The same sets the service worker is wired with.
export const saveable = new KindTest(media, new Set([FILE_KIND]));
export const playlists = new KindTest(media, new Set([PLAYLIST_KIND]));
export const heights = new UrlHeights(HEIGHT_PATTERNS);
export const extensions = new PathExtensions(saveable);
