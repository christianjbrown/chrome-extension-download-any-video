// What a URL says about the video behind it, as the parts that care ask.

// A whole file Chrome can download as it is, or a playlist of pieces: a player
// streams those, and a download has to fetch the pieces and join them.
export const FILE_KIND = "file";
export const PLAYLIST_KIND = "playlist";
export type MediaKind = typeof FILE_KIND | typeof PLAYLIST_KIND;

export const HLS_FORMAT = "hls";
export const DASH_FORMAT = "dash";
export type PlaylistFormat = typeof HLS_FORMAT | typeof DASH_FORMAT;

// Whether a URL is a video at all, and of which kind.
export interface MediaKinds {
  kindOf(url: string): MediaKind | undefined;
}

// A yes or no question about a URL, such as whether it can be saved as it is
// or whether it is a playlist. The entry points decide which kinds say yes.
export interface MediaTest {
  matches(url: string): boolean;
}

// Which kind of playlist a URL names, when it names one.
export interface PlaylistFormats {
  formatOf(url: string): PlaylistFormat | undefined;
}

// The extension a download of a URL should have, when it is a whole file.
export interface SavedExtensions {
  extensionOf(url: string): string | undefined;
}

// How tall a URL says its video is, or UNKNOWN_HEIGHT when it says nothing.
export interface HeightHints {
  heightOf(url: string): number;
}
