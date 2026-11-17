// The service worker: builds the object graph and connects it to Chrome's events.
import { isSchemeReport } from "../shared/scheme-messages";
import { HttpFetcher } from "../stream/fetching";
import {
  DashReferences,
  HlsReferences,
  PlaylistLister,
} from "../stream/stream-lister";
import { parseXml } from "../stream/xml-parser";
import { CandidateRanker } from "./candidate-ranker";
import { ChromeErrorExplainer } from "./chrome-errors";
import { ConversionHost } from "./conversion-host";
import { DownloadWatcher } from "./download-completion";
import { DownloadController } from "./download-controller";
import { FallbackConverter } from "./fallback-converter";
import { NavigationReset } from "./navigation-reset";
import { OffscreenConverter } from "./offscreen-converter";
import { OffscreenDocument } from "./offscreen-document";
import { PageScript } from "./page-script";
import { PieceFilter } from "./piece-filter";
import { SystemClock } from "./system-clock";
import { ToolbarIcon } from "./toolbar-icon";
import { ToolbarIndicator } from "./toolbar-indicator";
import { VideoFilename } from "./video-filename";
import { VideoSaver } from "./video-saver";

const indicator = new ToolbarIndicator(chrome.action);
const icon = new ToolbarIcon(chrome.action);
// One hidden page does two jobs: it converts videos, and it watches Chrome's
// colour scheme for the toolbar icon.
const hiddenPage = new OffscreenDocument(chrome.offscreen, chrome.runtime);
const playlists = new HttpFetcher((url, init) => fetch(url, init));
const controller = new DownloadController({
  asker: new PageScript(chrome.scripting, "page.js"),
  filter: new PieceFilter(
    new PlaylistLister({
      hls: new HlsReferences(playlists),
      dash: new DashReferences(playlists, parseXml),
    }),
  ),
  ranker: new CandidateRanker(),
  converter: new FallbackConverter(
    new OffscreenConverter({
      host: new ConversionHost(hiddenPage),
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
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isSchemeReport(message)) {
    void icon.show(message.scheme);
  }
});
// The hidden page is open for as long as Chrome runs, so a change of colour
// scheme reaches a sleeping service worker. Chrome starts without the page,
// and nothing else wakes the service worker then.
chrome.runtime.onStartup.addListener(() => {
  void hiddenPage.open();
});
void hiddenPage.open();
