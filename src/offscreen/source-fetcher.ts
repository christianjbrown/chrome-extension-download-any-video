import { FILE_KIND, mediaKind, type MediaKind } from "../shared/media-urls";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";
import type { Fetches } from "./video-fetcher";

// A whole file and a playlist are fetched differently; the address says which.
// An address that says nothing is taken for a file, since that is what Chrome
// would do with it.
const DEFAULT_KIND: MediaKind = FILE_KIND;

export class SourceFetcher implements Fetches {
  constructor(
    private readonly fetchers: Readonly<Record<MediaKind, Fetches>>,
  ) {}

  fetch(url: string, onProgress: ProgressListener): Promise<MediaInputs> {
    return this.fetchers[mediaKind(url) ?? DEFAULT_KIND].fetch(url, onProgress);
  }
}
