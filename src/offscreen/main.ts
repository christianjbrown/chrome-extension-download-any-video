// The offscreen document: a hidden extension page, open for as long as Chrome
// runs. It has ffmpeg.wasm in it for converting videos, and it watches
// Chrome's colour scheme for the service worker, which swaps it for a fresh
// page once the last download has landed.
import { DARK_SCHEME_QUERY } from "../shared/colour-scheme";
import { CONVERT_STAGE, FETCH_STAGE } from "../shared/conversion-messages";
import { FFMPEG_FILES } from "../shared/extension-files";
import { ExtensionMedia } from "../shared/extension-media";
import { FFMPEG_NOISE } from "../wiring/ffmpeg-noise";
import { MEDIA_EXTENSIONS } from "../wiring/media-extensions";
import { STREAM_REFUSALS } from "../wiring/stream-refusals";
import { SerialQueue } from "../shared/serial-queue";
import {
  DASH_FORMAT,
  FILE_KIND,
  HLS_FORMAT,
  PLAYLIST_KIND,
} from "../shared/media-types";
import { ByFormat } from "../stream/by-format";
import {
  dashManifestParser,
  hlsPlaylistParser,
} from "../wiring/stream-parsers";
import { DashTracks } from "../stream/dash-tracks";
import { HttpFetcher } from "../stream/fetching";
import { HlsTracks } from "../stream/hls-tracks";
import { PieceFetcher } from "../stream/piece-fetcher";
import { AUDIO_TRACK, MUXED_TRACK, VIDEO_TRACK } from "../stream/tracks";
import { SharpestFirst } from "../stream/sharpest-first";
import type { StreamReader } from "../stream/playlists";
import { PlaylistReader } from "../stream/stream-reader";
import { BlobUrls } from "./blob-urls";
import { OFFSCREEN_CONFIG } from "./config";
import { ConversionPlanner } from "./conversion-plan";
import { CompatibleAudioCopy, CompatibleVideoCopy } from "./copy-shortcuts";
import { NamedStage, StageChain } from "./conversion-stages";
import {
  FetchStep,
  ObjectUrlStep,
  StepChain,
  TranscodeStep,
} from "./conversion-steps";
import { ConvertHandler } from "./convert-handler";
import { ConvertListener } from "./convert-listener";
import { FfmpegEngine } from "./ffmpeg-engine";
import { RuntimeProgress } from "./runtime-progress";
import { SchemeReporter } from "./scheme-reporter";
import { SourceFetcher } from "./source-fetcher";
import { StreamFetcher } from "./stream-fetcher";
import { StreamInfoParser } from "./stream-info";
import { Transcoder } from "./transcoder";
import { VideoFetcher } from "./video-fetcher";
import { FFmpeg } from "@ffmpeg/ffmpeg";

const media = new ExtensionMedia(MEDIA_EXTENSIONS);
const sizes = new SharpestFirst();
const pieces = new HttpFetcher((url, init) => fetch(url, init));
// Another copyable codec is another entry here.
const shortcuts = {
  video: [new CompatibleVideoCopy()],
  audio: [new CompatibleAudioCopy()],
};
const fetcher = new SourceFetcher(
  {
    [FILE_KIND]: new VideoFetcher((url, init) => fetch(url, init)),
    [PLAYLIST_KIND]: new StreamFetcher(
      new PlaylistReader(
        new ByFormat<StreamReader>(media, {
          [HLS_FORMAT]: new HlsTracks(
            pieces,
            hlsPlaylistParser(),
            sizes,
            STREAM_REFUSALS,
          ),
          [DASH_FORMAT]: new DashTracks(
            pieces,
            dashManifestParser(),
            sizes,
            STREAM_REFUSALS,
          ),
        }),
      ),
      new PieceFetcher(pieces, OFFSCREEN_CONFIG.parallelFetches),
      // The picture comes muxed or on its own, and the sound on its own.
      {
        main: new Set([MUXED_TRACK, VIDEO_TRACK]),
        audio: new Set([AUDIO_TRACK]),
      },
      STREAM_REFUSALS,
    ),
  },
  media,
  // An address that says nothing is taken for a file, since that is what
  // Chrome would do with it.
  FILE_KIND,
);
const transcoder = new Transcoder({
  engine: new FfmpegEngine(
    new FFmpeg(),
    {
      core: chrome.runtime.getURL(FFMPEG_FILES.core),
      wasm: chrome.runtime.getURL(FFMPEG_FILES.wasm),
      worker: chrome.runtime.getURL(FFMPEG_FILES.worker),
      classWorker: chrome.runtime.getURL(FFMPEG_FILES.classWorker),
    },
    FFMPEG_NOISE,
  ),
  parser: new StreamInfoParser(),
  planner: new ConversionPlanner(OFFSCREEN_CONFIG.encoding, shortcuts),
  queue: new SerialQueue(),
});
// What a conversion runs through, in order. Another stage or step is another
// class and one more link here.
const listener = new ConvertListener(
  new ConvertHandler(
    new StageChain(
      new NamedStage(FETCH_STAGE, new FetchStep(fetcher)),
      new NamedStage(
        CONVERT_STAGE,
        new StepChain(
          new TranscodeStep(transcoder),
          new ObjectUrlStep(new BlobUrls(URL)),
        ),
      ),
    ),
    new RuntimeProgress(chrome.runtime),
  ),
);

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) =>
    listener.received(message, sendResponse),
);

new SchemeReporter(
  window.matchMedia(DARK_SCHEME_QUERY),
  chrome.runtime,
  (work, everyMs) => {
    window.setInterval(work, everyMs);
  },
  OFFSCREEN_CONFIG.schemeCheckMs,
).start();
