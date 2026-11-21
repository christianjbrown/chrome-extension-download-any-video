import { firstFound } from "../shared/optional";
import { fits, isRecord, isString, type Shape } from "../shared/shape";
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

// What each line's named groups have to hold to describe a stream.
const VIDEO_SHAPE: Shape = { codec: isString, pixelFormat: isString };
const AUDIO_SHAPE: Shape = { codec: isString };

// The named groups of the first line the pattern matches.
function firstMatch(lines: readonly string[], pattern: RegExp): unknown {
  return firstFound(lines, (line) => pattern.exec(line)?.groups);
}

function isVideoStream(groups: unknown): groups is VideoStream {
  return isRecord(groups) && fits(groups, VIDEO_SHAPE);
}

function isAudioStream(groups: unknown): groups is AudioStream {
  return isRecord(groups) && fits(groups, AUDIO_SHAPE);
}

// A stream the file does not have is left out, rather than set to nothing.
function videoPart(groups: unknown): Partial<StreamInfo> {
  return isVideoStream(groups) ? { video: groups } : {};
}

function audioPart(groups: unknown): Partial<StreamInfo> {
  return isAudioStream(groups) ? { audio: groups } : {};
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
