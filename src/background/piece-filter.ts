import type { FrameReport, VideoCandidate } from "../shared/candidates";
import { PLAYLIST_KIND, type MediaKinds } from "../shared/media-types";
import type { StreamLister } from "../stream/playlists";
import type { CandidateFilter } from "./download-steps";

// A player fetches a playlist's pieces one by one, and the page's network log
// shows each of them. A piece with a file's extension, an init.mp4 or a
// DASH_720.mp4, would otherwise win over the playlist as a whole file and
// come down as a few seconds of silent video. So every address a playlist on
// the page points at is dropped before the ranking, sub-playlists included,
// and the playlist stands for the lot. A playlist that cannot be read drops
// nothing.
export class PieceFilter implements CandidateFilter {
  constructor(
    private readonly lister: StreamLister,
    private readonly kinds: MediaKinds,
  ) {}

  async filter(reports: readonly FrameReport[]): Promise<FrameReport[]> {
    const listed = await this.listedBy(
      reports.flatMap((report) => report.candidates),
    );
    return reports.map((report) => ({
      ...report,
      candidates: report.candidates.filter(
        (candidate) => !listed.has(fileKey(candidate.url)),
      ),
    }));
  }

  private async listedBy(
    candidates: readonly VideoCandidate[],
  ): Promise<Set<string>> {
    const playlists = new Set(
      candidates
        .map((candidate) => candidate.url)
        .filter((url) => this.kinds.kindOf(url) === PLAYLIST_KIND),
    );
    const references = await Promise.all(
      Array.from(playlists, (url) =>
        this.lister.references(url).catch((): string[] => []),
      ),
    );
    return new Set(references.flat().map(fileKey));
  }
}

// The same file whatever token or cache-buster the query carries.
function fileKey(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}
