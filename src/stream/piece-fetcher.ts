import type { ByteFetcher } from "./fetching";
import type { Progress } from "./progress";
import type { Track, TrackRole } from "./tracks";

// A track's bytes, in playing order.
export interface FetchedTrack {
  readonly role: TrackRole;
  readonly parts: readonly ArrayBuffer[];
}

export interface TrackFetcher {
  fetchAll(
    tracks: readonly Track[],
    progress: Progress,
  ): Promise<FetchedTrack[]>;
}

// Fetches every piece of every track, a few at a time, saying how far it has
// got after each batch.
export class PieceFetcher implements TrackFetcher {
  constructor(
    private readonly fetcher: ByteFetcher,
    // Pieces fetched at once.
    private readonly parallel: number,
  ) {}

  async fetchAll(
    tracks: readonly Track[],
    progress: Progress,
  ): Promise<FetchedTrack[]> {
    const total = tracks.reduce((sum, track) => sum + track.pieces.length, 0);
    let done = 0;
    progress.report(done, total);
    const fetched: FetchedTrack[] = [];
    for (const track of tracks) {
      const parts: ArrayBuffer[] = [];
      for (let start = 0; start < track.pieces.length; start += this.parallel) {
        const batch = track.pieces.slice(start, start + this.parallel);
        parts.push(
          ...(await Promise.all(
            batch.map((piece) => this.fetcher.bytes(piece.url, piece.range)),
          )),
        );
        done += batch.length;
        progress.report(done, total);
      }
      fetched.push({ role: track.role, parts });
    }
    return fetched;
  }
}
