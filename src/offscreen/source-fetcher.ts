import {
  FILE_KIND,
  type MediaKind,
  type MediaKinds,
} from "../shared/media-types";
import type { Fetches } from "./conversion-parts";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";

// A whole file and a playlist are fetched differently; the address says which.
// An address that says nothing is taken for a file, since that is what Chrome
// would do with it.
const DEFAULT_KIND: MediaKind = FILE_KIND;

export class SourceFetcher implements Fetches {
  constructor(
    private readonly fetchers: Readonly<Record<MediaKind, Fetches>>,
    private readonly kinds: MediaKinds,
  ) {}

  fetch(url: string, onProgress: ProgressListener): Promise<MediaInputs> {
    return this.fetchers[this.kinds.kindOf(url) ?? DEFAULT_KIND].fetch(
      url,
      onProgress,
    );
  }
}
