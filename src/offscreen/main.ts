// The offscreen document: a hidden extension page with ffmpeg.wasm in it,
// opened by the service worker when a video needs converting and closed when
// the download has landed.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { isConvertRequest } from "../shared/conversion-messages";
import { DashTracks } from "../stream/dash-tracks";
import { HttpFetcher } from "../stream/fetching";
import { HlsTracks } from "../stream/hls-tracks";
import { PieceFetcher } from "../stream/piece-fetcher";
import { PlaylistReader } from "../stream/stream-reader";
import { parseXml } from "../stream/xml-parser";
import { ConversionPlanner } from "./conversion-plan";
import { ConvertHandler } from "./convert-handler";
import { FfmpegEngine } from "./ffmpeg-engine";
import { SourceFetcher } from "./source-fetcher";
import { StreamFetcher } from "./stream-fetcher";
import { StreamInfoParser } from "./stream-info";
import { Transcoder } from "./transcoder";
import { VideoFetcher } from "./video-fetcher";

const MP4_TYPE = "video/mp4";

const pieces = new HttpFetcher((url, init) => fetch(url, init));
const handler = new ConvertHandler({
  fetcher: new SourceFetcher({
    file: new VideoFetcher((url, init) => fetch(url, init)),
    playlist: new StreamFetcher(
      new PlaylistReader({
        hls: new HlsTracks(pieces),
        dash: new DashTracks(pieces, parseXml),
      }),
      new PieceFetcher(pieces),
    ),
  }),
  transcoder: new Transcoder({
    engine: new FfmpegEngine(new FFmpeg(), {
      core: chrome.runtime.getURL("ffmpeg/ffmpeg-core.js"),
      wasm: chrome.runtime.getURL("ffmpeg/ffmpeg-core.wasm"),
      worker: chrome.runtime.getURL("ffmpeg/ffmpeg-core.worker.js"),
      classWorker: chrome.runtime.getURL("ffmpeg-worker.js"),
    }),
    parser: new StreamInfoParser(),
    planner: new ConversionPlanner(),
  }),
  urls: {
    create: (data) =>
      URL.createObjectURL(new Blob([data as BlobPart], { type: MP4_TYPE })),
  },
  progress: {
    send: (report) => {
      // Nobody listening is not a problem worth stopping for.
      chrome.runtime.sendMessage(report).catch(() => undefined);
    },
  },
});

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (!isConvertRequest(message)) {
      return false;
    }
    void handler.handle(message).then(sendResponse);
    return true;
  },
);
