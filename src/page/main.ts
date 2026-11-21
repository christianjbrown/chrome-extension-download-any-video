// The script injected into every frame of the tab: builds the finder and leaves
// it where the service worker's second call can reach it. It changes nothing on
// the page and listens to nothing; it only answers.
import { ExtensionMedia } from "../shared/extension-media";
import { MEDIA_EXTENSIONS } from "../wiring/media-extensions";
import { FINDER_KEY } from "../shared/installed-finder";
import { HEIGHT_PATTERNS } from "../wiring/height-patterns";
import { VIDEO_META } from "../wiring/video-meta";
import { UrlHeights } from "../shared/url-heights";
import { WebUrls } from "../shared/web-urls";
import { MediaCandidates } from "./media-candidates";
import { NetworkFinder } from "./network-entries";
import { MetadataFinder } from "./page-metadata";
import { PlayerAttributeFinder } from "./player-attributes";
import { ShadowLineage, ShadowTreeWalk } from "./tree-walk";
import { VideoElementFinder } from "./video-elements";
import { VideoFinder } from "./video-finder";
import { VisibleVideoChooser } from "./visible-video";

// The performance entries for what the page has fetched.
const RESOURCE_ENTRIES = "resource";

const candidates = new MediaCandidates(
  new ExtensionMedia(MEDIA_EXTENSIONS),
  new UrlHeights(HEIGHT_PATTERNS),
);
const finder = new VideoFinder({
  tree: document,
  title: () => document.title,
  elements: new VideoElementFinder(new ShadowTreeWalk(), new WebUrls()),
  chooser: new VisibleVideoChooser(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  })),
  player: new PlayerAttributeFinder(candidates, new ShadowLineage()),
  metadata: new MetadataFinder(
    (text): unknown => JSON.parse(text),
    candidates,
    VIDEO_META,
  ),
  network: new NetworkFinder(
    () =>
      performance.getEntriesByType(RESOURCE_ENTRIES).map((entry) => entry.name),
    candidates,
  ),
});

Reflect.set(globalThis, FINDER_KEY, finder);
