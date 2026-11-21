import type { FormatChoice, StreamReader } from "./playlists";
import type { Track } from "./tracks";

// Hands the address to the reader for its format.
export class PlaylistReader implements StreamReader {
  constructor(private readonly readers: FormatChoice<StreamReader>) {}

  async tracks(url: string): Promise<Track[]> {
    return this.readers.handlerFor(url).tracks(url);
  }
}
