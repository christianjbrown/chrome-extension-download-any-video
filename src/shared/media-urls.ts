// What a URL says about the video behind it, from its path alone.

// A whole file Chrome can download as it is.
const FILE_EXTENSIONS: ReadonlySet<string> = new Set([
  "mp4",
  "m4v",
  "mov",
  "webm",
  "ogv",
  "mkv",
]);
// A playlist of pieces: a player streams these, a download gets only the list.
const PLAYLIST_EXTENSIONS: ReadonlySet<string> = new Set(["m3u8", "mpd"]);

export type MediaKind = "file" | "playlist";

const SMALLEST_HEIGHT = 144;
const TALLEST_HEIGHT = 4320;

// How a height turns up in a URL: "720p", "res_1080p", "1280x720", "DASH_720".
const HEIGHT_PATTERNS: readonly RegExp[] = [
  /(\d{3,4})p(?![a-z])/i,
  /\d{3,4}x(\d{3,4})/,
  /[_-](\d{3,4})(?=[._/-]|$)/,
];

export function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function pathExtension(url: string): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return undefined;
  }
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  const dot = last.lastIndexOf(".");
  return dot === -1 ? undefined : last.slice(dot + 1).toLowerCase();
}

export function mediaKind(url: string): MediaKind | undefined {
  const extension = pathExtension(url);
  if (extension === undefined) {
    return undefined;
  }
  if (FILE_EXTENSIONS.has(extension)) {
    return "file";
  }
  return PLAYLIST_EXTENSIONS.has(extension) ? "playlist" : undefined;
}

// The extension a download of this URL should have.
export function fileExtension(url: string): string | undefined {
  return mediaKind(url) === "file" ? pathExtension(url) : undefined;
}

function plausibleHeight(height: number): boolean {
  return height >= SMALLEST_HEIGHT && height <= TALLEST_HEIGHT;
}

// The height a URL's path and query advertise, or 0 when they say nothing.
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
  return 0;
}
