// What the rest of the extension asks of a playlist, whatever its format.
import type { Track } from "./tracks";

// Reads a playlist and says which pieces make up the video, by track.
export interface StreamReader {
  tracks(url: string): Promise<Track[]>;
}

// Everything a playlist points at: its sub-playlists and every piece of every
// track. A page's network log shows these too, and none of them is the whole
// video, however much a lone init.mp4 or DASH_720.mp4 looks like one.
export interface StreamLister {
  references(url: string): Promise<string[]>;
}

// The one of several handlers that suits a playlist's format.
export interface FormatChoice<T> {
  // Throws NOT_A_PLAYLIST when the address is not a playlist it knows.
  handlerFor(url: string): T;
}

export const NOT_A_PLAYLIST =
  "That address is not a playlist this extension knows";
