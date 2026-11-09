// The service worker: builds the object graph and connects it to Chrome's events.
import { CandidateRanker } from "./candidate-ranker";
import { ChromeErrorExplainer } from "./chrome-errors";
import { DownloadWatcher } from "./download-completion";
import { DownloadController } from "./download-controller";
import { FallbackConverter } from "./fallback-converter";
import { NavigationReset } from "./navigation-reset";
import { OffscreenConverter } from "./offscreen-converter";
import { OffscreenDocument } from "./offscreen-document";
import { PageScript } from "./page-script";
import { SystemClock } from "./system-clock";
import { ToolbarIndicator } from "./toolbar-indicator";
import { VideoFilename } from "./video-filename";
import { VideoSaver } from "./video-saver";

const indicator = new ToolbarIndicator(chrome.action);
const controller = new DownloadController({
  asker: new PageScript(chrome.scripting, "page.js"),
  ranker: new CandidateRanker(),
  converter: new FallbackConverter(
    new OffscreenConverter({
      host: new OffscreenDocument(chrome.offscreen, chrome.runtime),
      runtime: chrome.runtime,
      nextId: () => crypto.randomUUID(),
    }),
  ),
  names: new VideoFilename(new SystemClock()),
  saver: new VideoSaver(
    chrome.downloads,
    new DownloadWatcher(chrome.downloads),
  ),
  indicator,
  errors: new ChromeErrorExplainer(),
});
const navigation = new NavigationReset(indicator);

chrome.action.onClicked.addListener((tab) => {
  void controller.clicked(tab);
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  void navigation.changed(tabId, change);
});
