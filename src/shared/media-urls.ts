// What a URL says about the video behind it, from its path alone.
import { UNKNOWN_HEIGHT } from "./candidates";
import { NOT_FOUND } from "./search";

// A whole file Chrome can download as it is, or a playlist of pieces: a player
// streams those, and a download has to fetch the pieces and join them.
export const FILE_KIND = "file";
export const PLAYLIST_KIND = "playlist";
export type MediaKind = typeof FILE_KIND | typeof PLAYLIST_KIND;

export const HLS_FORMAT = "hls";
export const DASH_FORMAT = "dash";
export type PlaylistFormat = typeof HLS_FORMAT | typeof DASH_FORMAT;

const FILE_EXTENSIONS: readonly string[] = [
  "mp4",
  "m4v",
  "mov",
  "webm",
  "ogv",
  "mkv",
];
const FORMAT_OF_EXTENSION: ReadonlyMap<string, PlaylistFormat> = new Map([
  ["m3u8", HLS_FORMAT],
  ["mpd", DASH_FORMAT],
]);
const KIND_OF_EXTENSION: ReadonlyMap<string, MediaKind> = new Map([
  ...FILE_EXTENSIONS.map((extension) => [extension, FILE_KIND] as const),
  ...Array.from(
    FORMAT_OF_EXTENSION.keys(),
    (extension) => [extension, PLAYLIST_KIND] as const,
  ),
]);

// The range of heights video is actually made in, from 144p to 8K. A number
// outside it in a URL is an id or a date, not a height.
const SMALLEST_HEIGHT = 144;
const TALLEST_HEIGHT = 4320;

// How a height turns up in a URL: "720p", "res_1080p", "1280x720", "DASH_720".
const HEIGHT_PATTERNS: readonly RegExp[] = [
  /(\d{3,4})p(?![a-z])/i,
  /\d{3,4}x(\d{3,4})/,
  /[_-](\d{3,4})(?=[._/-]|$)/,
];
const WEB_URL = /^https?:\/\//i;
const PATH_SEPARATOR = "/";
const EXTENSION_MARK = ".";

export function isWebUrl(url: string): boolean {
  return WEB_URL.test(url);
}

// The extension on the URL's path, lower case, or nothing when it has none.
export function pathExtension(url: string): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return undefined;
  }
  const last = pathname.slice(pathname.lastIndexOf(PATH_SEPARATOR) + 1);
  const dot = last.lastIndexOf(EXTENSION_MARK);
  return dot === NOT_FOUND ? undefined : last.slice(dot + 1).toLowerCase();
}

export function mediaKind(url: string): MediaKind | undefined {
  const extension = pathExtension(url);
  return extension === undefined ? undefined : KIND_OF_EXTENSION.get(extension);
}

// Which kind of playlist a URL names, when it names one.
export function playlistFormat(url: string): PlaylistFormat | undefined {
  const extension = pathExtension(url);
  return extension === undefined
    ? undefined
    : FORMAT_OF_EXTENSION.get(extension);
}

// The extension a download of this URL should have.
export function fileExtension(url: string): string | undefined {
  return mediaKind(url) === FILE_KIND ? pathExtension(url) : undefined;
}

function plausibleHeight(height: number): boolean {
  return height >= SMALLEST_HEIGHT && height <= TALLEST_HEIGHT;
}

// The height a URL's path and query advertise, or UNKNOWN_HEIGHT when they
// say nothing.
export function heightHint(url: string): number {
  for (const pattern of HEIGHT_PATTERNS) {
    const match = pattern.exec(url);
    if (match?.[1] !== undefined) {
      const height = Number(match[1]);
      if (plausibleHeight(height)) {
        return height;
      }
    }
  }
  return UNKNOWN_HEIGHT;
}
