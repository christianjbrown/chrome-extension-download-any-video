import { firstFound } from "../shared/optional";
import type {
  AudioStream,
  StreamInfo,
  StreamInfoParsing,
  VideoStream,
} from "./conversion-parts";

// "Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709), 1280x720 ..."
// The codec is followed by its profile and tag in brackets, then the pixel format.
const VIDEO_LINE = /: Video: (?<codec>\w+)(?: \([^)]*\))*, (?<pixelFormat>\w+)/;
// "Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo ..."
const AUDIO_LINE = /: Audio: (?<codec>\w+)/;

type Groups = Record<string, string>;

// The named groups of the first line the pattern matches. Every group in these
// patterns is required, so a match always fills them all.
function firstMatch(
  lines: readonly string[],
  pattern: RegExp,
): Groups | undefined {
  return firstFound(lines, (line) => pattern.exec(line)?.groups);
}

// A stream the file does not have is left out, rather than set to nothing.
function videoPart(groups: Groups | undefined): Partial<StreamInfo> {
  return groups === undefined
    ? {}
    : { video: groups as unknown as VideoStream };
}

function audioPart(groups: Groups | undefined): Partial<StreamInfo> {
  return groups === undefined
    ? {}
    : { audio: groups as unknown as AudioStream };
}

// Reads the codecs out of what ffmpeg prints about a file. The first video
// stream is the picture; a later one is usually cover art.
export class StreamInfoParser implements StreamInfoParsing {
  parse(lines: readonly string[]): StreamInfo {
    return {
      ...videoPart(firstMatch(lines, VIDEO_LINE)),
      ...audioPart(firstMatch(lines, AUDIO_LINE)),
    };
  }
}
