import type { MediaKind, MediaKinds } from "../shared/media-types";
import type { Fetches } from "./conversion-parts";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";

// A whole file and a playlist are fetched differently; the address says which.
export class SourceFetcher implements Fetches {
  constructor(
    private readonly fetchers: Readonly<Record<MediaKind, Fetches>>,
    private readonly kinds: MediaKinds,
    // The kind an address that says nothing is taken for.
    private readonly fallback: MediaKind,
  ) {}

  fetch(url: string, onProgress: ProgressListener): Promise<MediaInputs> {
    return this.fetchers[this.kinds.kindOf(url) ?? this.fallback].fetch(
      url,
      onProgress,
    );
  }
}
