import { playlistFormat, type PlaylistFormat } from "../shared/media-urls";
import type { Track } from "./tracks";

// Reads a playlist and says which pieces make up the video, by track.
export interface StreamReader {
  tracks(url: string): Promise<Track[]>;
}

export const NOT_A_PLAYLIST =
  "That address is not a playlist this extension knows";

// Each playlist format has its own reader; this hands the address to the
// right one.
export class PlaylistReader implements StreamReader {
  constructor(
    private readonly readers: Readonly<Record<PlaylistFormat, StreamReader>>,
  ) {}

  tracks(url: string): Promise<Track[]> {
    const format = playlistFormat(url);
    if (format === undefined) {
      return Promise.reject(new Error(NOT_A_PLAYLIST));
    }
    return this.readers[format].tracks(url);
  }
}
