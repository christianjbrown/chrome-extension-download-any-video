// The script injected into every frame of the tab: builds the finder and leaves
// it where the service worker's second call can reach it. It changes nothing on
// the page and listens to nothing; it only answers.
import { ExtensionMedia, MEDIA_EXTENSIONS } from "../shared/extension-media";
import { FINDER_KEY, type InstalledFinder } from "../shared/installed-finder";
import { HEIGHT_PATTERNS, UrlHeights } from "../shared/url-heights";
import { MediaCandidates } from "./media-candidates";
import { NetworkFinder } from "./network-entries";
import { MetadataFinder } from "./page-metadata";
import { PlayerAttributeFinder } from "./player-attributes";
import { VideoFinder } from "./video-finder";
import { VideoElementFinder } from "./video-elements";
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
  elements: new VideoElementFinder(),
  chooser: new VisibleVideoChooser(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  })),
  player: new PlayerAttributeFinder(candidates),
  metadata: new MetadataFinder(
    (text) => JSON.parse(text) as unknown,
    candidates,
  ),
  network: new NetworkFinder(
    () =>
      performance.getEntriesByType(RESOURCE_ENTRIES).map((entry) => entry.name),
    candidates,
  ),
});

(globalThis as unknown as Record<string, InstalledFinder>)[FINDER_KEY] = {
  find: () => finder.find(),
};
