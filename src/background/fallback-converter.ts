import type { Stage } from "../shared/conversion-messages";
import {
  FILE_KIND,
  type MediaKinds,
  type SavedExtensions,
} from "../shared/media-types";
import {
  ConversionError,
  type StageProgressListener,
  type VideoConverter,
  type VideoSource,
} from "./video-converter";

// What the converter needs to know about a URL to fall back on it.
type FileMedia = MediaKinds & SavedExtensions;

function asItIs(url: string, media: SavedExtensions): VideoSource {
  return {
    url,
    extension: media.extensionOf(url),
    converted: false,
    release: () => Promise.resolve(),
  };
}

// When the video cannot be fetched or cannot be converted, Chrome downloads it
// as it is, the way it always could, rather than the click coming to nothing.
// A playlist is only a list of pieces, so there is nothing to fall back to.
export class FallbackConverter implements VideoConverter {
  constructor(
    private readonly inner: VideoConverter,
    private readonly media: FileMedia,
    // The stages whose failure still leaves a file worth saving as it is.
    private readonly recoverable: readonly Stage[],
  ) {}

  async convert(
    url: string,
    onProgress: StageProgressListener,
  ): Promise<VideoSource> {
    try {
      return await this.inner.convert(url, onProgress);
    } catch (error) {
      if (
        this.worthFallingBackOn(error) &&
        this.media.kindOf(url) === FILE_KIND
      ) {
        return asItIs(url, this.media);
      }
      throw error;
    }
  }

  private worthFallingBackOn(error: unknown): boolean {
    return (
      error instanceof ConversionError && this.recoverable.includes(error.stage)
    );
  }
}
