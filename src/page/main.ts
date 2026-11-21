// The script injected into every frame of the tab: builds the finder and leaves
// it where the service worker's second call can reach it. It changes nothing on
// the page and listens to nothing; it only answers.
import { FINDER_KEY, type InstalledFinder } from "../shared/installed-finder";
import { NetworkFinder } from "./network-entries";
import { MetadataFinder } from "./page-metadata";
import { PlayerAttributeFinder } from "./player-attributes";
import { VideoFinder } from "./video-finder";
import { VideoElementFinder } from "./video-elements";
import { VisibleVideoChooser } from "./visible-video";

// The performance entries for what the page has fetched.
const RESOURCE_ENTRIES = "resource";

const finder = new VideoFinder({
  tree: document,
  title: () => document.title,
  elements: new VideoElementFinder(),
  chooser: new VisibleVideoChooser(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  })),
  player: new PlayerAttributeFinder(),
  metadata: new MetadataFinder((text) => JSON.parse(text) as unknown),
  network: new NetworkFinder(() =>
    performance.getEntriesByType(RESOURCE_ENTRIES).map((entry) => entry.name),
  ),
});

(globalThis as unknown as Record<string, InstalledFinder>)[FINDER_KEY] = {
  find: () => finder.find(),
};
