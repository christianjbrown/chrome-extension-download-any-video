export interface VideoStream {
  readonly codec: string;
  readonly pixelFormat: string;
}

export interface AudioStream {
  readonly codec: string;
}

export interface StreamInfo {
  readonly video?: VideoStream;
  readonly audio?: AudioStream;
}

export interface StreamInfoParsing {
  parse(lines: readonly string[]): StreamInfo;
}

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
  for (const line of lines) {
    const groups = pattern.exec(line)?.groups;
    if (groups !== undefined) {
      return groups;
    }
  }
  return undefined;
}

function asVideo(groups: Groups): VideoStream {
  return groups as unknown as VideoStream;
}

function asAudio(groups: Groups): AudioStream {
  return groups as unknown as AudioStream;
}

// Reads the codecs out of what ffmpeg prints about a file. The first video
// stream is the picture; a later one is usually cover art.
export class StreamInfoParser implements StreamInfoParsing {
  parse(lines: readonly string[]): StreamInfo {
    const video = firstMatch(lines, VIDEO_LINE);
    const audio = firstMatch(lines, AUDIO_LINE);
    return {
      ...(video === undefined ? {} : { video: asVideo(video) }),
      ...(audio === undefined ? {} : { audio: asAudio(audio) }),
    };
  }
}
