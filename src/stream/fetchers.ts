// Fetching a stream's playlists and pieces, as the parts that read and join
// them see it.
import type { Progress } from "./progress";
import type { ByteRange, Track, TrackRole } from "./tracks";

// A playlist's text.
export interface TextFetcher {
  text(url: string): Promise<string>;
}

// A piece's bytes, the whole of its URL or a slice of it.
export interface ByteFetcher {
  bytes(url: string, range?: ByteRange): Promise<ArrayBuffer>;
}

// A track's bytes, in playing order.
export interface FetchedTrack {
  readonly role: TrackRole;
  readonly parts: readonly ArrayBuffer[];
}

// Fetches every piece of every track.
export interface TrackFetcher {
  fetchAll(
    tracks: readonly Track[],
    progress: Progress,
  ): Promise<FetchedTrack[]>;
}
