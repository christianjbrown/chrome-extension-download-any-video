import type { ByteFetcher, FetchedTrack, TrackFetcher } from "./fetchers";
import type { Progress } from "./progress";
import type { Track } from "./tracks";

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
    const advance = (count: number): void => {
      done += count;
      progress.report(done, total);
    };
    const fetched: FetchedTrack[] = [];
    for (const track of tracks) {
      fetched.push({
        role: track.role,
        parts: await this.parts(track, advance),
      });
    }
    return fetched;
  }

  // One track's pieces in order, a batch at a time, counting each batch.
  private async parts(
    track: Track,
    advance: (count: number) => void,
  ): Promise<ArrayBuffer[]> {
    const parts: ArrayBuffer[] = [];
    for (let start = 0; start < track.pieces.length; start += this.parallel) {
      const batch = track.pieces.slice(start, start + this.parallel);
      parts.push(
        ...(await Promise.all(
          batch.map((piece) => this.fetcher.bytes(piece.url, piece.range)),
        )),
      );
      advance(batch.length);
    }
    return parts;
  }
}
