// The service worker: builds the object graph and connects it to Chrome's events.
import { CONVERT_STAGE, FETCH_STAGE } from "../shared/conversion-messages";
import { OFFSCREEN_PAGE, PAGE_SCRIPT_FILE } from "../shared/extension-files";
import { ExtensionMedia } from "../shared/extension-media";
import { KindTest } from "../shared/kind-test";
import { MEDIA_EXTENSIONS } from "../shared/media-extensions";
import { PathExtensions } from "../shared/path-extensions";
import {
  DASH_FORMAT,
  FILE_KIND,
  HLS_FORMAT,
  PLAYLIST_KIND,
} from "../shared/media-types";
import { ByFormat } from "../stream/by-format";
import { DashManifestParser } from "../stream/dash-manifest";
import {
  SegmentListSource,
  SegmentTemplateSource,
} from "../stream/dash-pieces";
import { DashReferences } from "../stream/dash-references";
import { HttpFetcher } from "../stream/fetching";
import { HlsPlaylistParser } from "../stream/hls-playlist";
import { HlsReferences } from "../stream/hls-references";
import { PlaylistLister } from "../stream/playlist-lister";
import type { StreamLister } from "../stream/playlists";
import { parseXml } from "../stream/xml-parser";
import { CandidateRanker, RANKING } from "./candidate-ranker";
import { ChromeErrorExplainer } from "./chrome-errors";
import { CHROME_TRANSLATIONS } from "./chrome-translations";
import { ClickScheme } from "./click-scheme";
import { ClosedTabAction } from "./closed-tab-action";
import { BACKGROUND_CONFIG } from "./config";
import { ConversionHost } from "./conversion-host";
import { DownloadWatcher } from "./download-completion";
import { DownloadController } from "./download-controller";
import { FallbackConverter } from "./fallback-converter";
import { KebabSlugger } from "./filename-text";
import { NavigationReset } from "./navigation-reset";
import { OffscreenConverter } from "./offscreen-converter";
import { OffscreenDocument } from "./offscreen-document";
import { PageScript } from "./page-script";
import { PieceFilter } from "./piece-filter";
import { QuietProgress } from "./quiet-progress";
import { SchemeReportListener } from "./scheme-report-listener";
import { SCHEME_POLICY, UNKNOWN_SCHEME } from "./scheme-state";
import { SchemeStore } from "./scheme-store";
import { ConvertingTitle, FetchingTitle } from "./stage-titles";
import { SystemClock } from "./system-clock";
import { TabScheme } from "./tab-scheme";
import { ToolbarIcon } from "./toolbar-icon";
import type { StageTitles } from "./toolbar";
import { ToolbarIndicator } from "./toolbar-indicator";
import { ButtonLooks } from "./toolbar-looks";
import { ToolbarScheme } from "./toolbar-scheme";
import { VideoFilename } from "./video-filename";
import { VideoSaver } from "./video-saver";

// Another stage is another entry here, and the compiler asks for one.
const stageTitles = {
  [FETCH_STAGE]: new FetchingTitle(),
  [CONVERT_STAGE]: new ConvertingTitle(),
} satisfies StageTitles;
const looks = new ButtonLooks(stageTitles);
const indicator = new QuietProgress(
  new ToolbarIndicator(new ClosedTabAction(chrome.action), looks),
  looks,
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
const media = new ExtensionMedia(MEDIA_EXTENSIONS);
// Which kinds Chrome can save as they are, and which are playlists of pieces.
// Another kind joins whichever set it belongs to here.
const isSaveable = new KindTest(media, new Set([FILE_KIND]));
const isPlaylist = new KindTest(media, new Set([PLAYLIST_KIND]));
// The ways a DASH manifest names its pieces, most specific first. Another way
// is another entry here.
const pieceSources = [new SegmentListSource(), new SegmentTemplateSource()];
const playlists = new HttpFetcher((url, init) => fetch(url, init));
const controller = new DownloadController({
  asker: new PageScript(chrome.scripting, PAGE_SCRIPT_FILE),
  filter: new PieceFilter(
    new PlaylistLister(
      new ByFormat<StreamLister>(media, {
        [HLS_FORMAT]: new HlsReferences(playlists, new HlsPlaylistParser()),
        [DASH_FORMAT]: new DashReferences(
          playlists,
          new DashManifestParser(parseXml, pieceSources),
        ),
      }),
    ),
    isPlaylist,
  ),
  ranker: new CandidateRanker(RANKING, media),
  converter: new FallbackConverter(
    new OffscreenConverter({
      host: new ConversionHost(hiddenPage),
      runtime: chrome.runtime,
      nextId: () => crypto.randomUUID(),
    }),
    isSaveable,
    new PathExtensions(isSaveable),
    // Both steps can fail on a video that is nonetheless a perfectly good
    // file: a server that only answers its own player, or a codec ffmpeg
    // cannot read.
    [FETCH_STAGE, CONVERT_STAGE],
  ),
  names: new VideoFilename(
    new SystemClock(),
    new KebabSlugger(),
    BACKGROUND_CONFIG.maxStem,
  ),
  saver: new VideoSaver(
    chrome.downloads,
    new DownloadWatcher(chrome.downloads),
  ),
  indicator,
  errors: new ChromeErrorExplainer(CHROME_TRANSLATIONS),
});
const navigation = new NavigationReset(indicator);
const schemeReports = new SchemeReportListener(toolbarScheme);

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
  schemeReports.received(message);
});
// The hidden page is open for as long as Chrome runs, so a change of colour
// scheme reaches a sleeping service worker. Chrome starts without the page,
// and nothing else wakes the service worker then.
chrome.runtime.onStartup.addListener(() => {
  void hiddenPage.open();
});
void hiddenPage.open();
