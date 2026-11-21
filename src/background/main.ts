// The service worker: builds the object graph and connects it to Chrome's events.
import { OFFSCREEN_PAGE, PAGE_SCRIPT_FILE } from "../shared/extension-files";
import { DASH_FORMAT, HLS_FORMAT } from "../shared/media-urls";
import { isSchemeReport } from "../shared/scheme-messages";
import { HttpFetcher } from "../stream/fetching";
import {
  DashReferences,
  HlsReferences,
  PlaylistLister,
} from "../stream/stream-lister";
import { parseXml } from "../stream/xml-parser";
import { CandidateRanker, RANKING } from "./candidate-ranker";
import { BACKGROUND_CONFIG } from "./config";
import { CHROME_TRANSLATIONS, ChromeErrorExplainer } from "./chrome-errors";
import { ClickScheme } from "./click-scheme";
import { ClosedTabAction } from "./closed-tab-action";
import { ConversionHost } from "./conversion-host";
import { DownloadWatcher } from "./download-completion";
import { DownloadController } from "./download-controller";
import { FallbackConverter } from "./fallback-converter";
import { NavigationReset } from "./navigation-reset";
import { OffscreenConverter } from "./offscreen-converter";
import { OffscreenDocument } from "./offscreen-document";
import { PageScript } from "./page-script";
import { PieceFilter } from "./piece-filter";
import { QuietProgress } from "./quiet-progress";
import { SCHEME_POLICY, UNKNOWN_SCHEME } from "./scheme-state";
import { SchemeStore } from "./scheme-store";
import { SystemClock } from "./system-clock";
import { TabScheme } from "./tab-scheme";
import { ToolbarIcon } from "./toolbar-icon";
import { ToolbarIndicator } from "./toolbar-indicator";
import { TOOLBAR_LOOKS } from "./toolbar-looks";
import { ToolbarScheme } from "./toolbar-scheme";
import { VideoFilename } from "./video-filename";
import { VideoSaver } from "./video-saver";

const indicator = new QuietProgress(
  new ToolbarIndicator(new ClosedTabAction(chrome.action), TOOLBAR_LOOKS),
  TOOLBAR_LOOKS,
);
const toolbarScheme = new ToolbarScheme(
  new SchemeStore(chrome.storage.local, UNKNOWN_SCHEME),
  new ToolbarIcon(chrome.action),
  SCHEME_POLICY,
);
const clickScheme = new ClickScheme(
  new TabScheme(chrome.scripting),
  toolbarScheme,
);
// One hidden page does two jobs: it converts videos, and it watches Chrome's
// colour scheme for the toolbar icon.
const hiddenPage = new OffscreenDocument(
  chrome.offscreen,
  chrome.runtime,
  OFFSCREEN_PAGE,
);
const playlists = new HttpFetcher((url, init) => fetch(url, init));
const controller = new DownloadController({
  asker: new PageScript(chrome.scripting, PAGE_SCRIPT_FILE),
  filter: new PieceFilter(
    new PlaylistLister({
      [HLS_FORMAT]: new HlsReferences(playlists),
      [DASH_FORMAT]: new DashReferences(playlists, parseXml),
    }),
  ),
  ranker: new CandidateRanker(RANKING),
  converter: new FallbackConverter(
    new OffscreenConverter({
      host: new ConversionHost(hiddenPage),
      runtime: chrome.runtime,
      nextId: () => crypto.randomUUID(),
    }),
  ),
  names: new VideoFilename(new SystemClock(), BACKGROUND_CONFIG.maxStem),
  saver: new VideoSaver(
    chrome.downloads,
    new DownloadWatcher(chrome.downloads),
  ),
  indicator,
  errors: new ChromeErrorExplainer(CHROME_TRANSLATIONS),
});
const navigation = new NavigationReset(indicator);

chrome.action.onClicked.addListener((tab) => {
  void controller.clicked(tab);
  // Beside the download, not part of it: whatever the read does, the download
  // neither waits for it nor hears about it.
  void clickScheme.clicked(tab);
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  void navigation.changed(tabId, change);
});
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isSchemeReport(message)) {
    void toolbarScheme.deviceIs(message.scheme);
  }
});
// The hidden page is open for as long as Chrome runs, so a change of colour
// scheme reaches a sleeping service worker. Chrome starts without the page,
// and nothing else wakes the service worker then.
chrome.runtime.onStartup.addListener(() => {
  void hiddenPage.open();
});
void hiddenPage.open();
