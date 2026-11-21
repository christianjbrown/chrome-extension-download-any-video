import { CONVERT_STAGE, FETCH_STAGE } from "../shared/conversion-messages";
import { FILE_KIND, fileExtension, mediaKind } from "../shared/media-urls";
import {
  ConversionError,
  type StageProgressListener,
  type VideoConverter,
  type VideoSource,
} from "./video-converter";

function asItIs(url: string): VideoSource {
  return {
    url,
    extension: fileExtension(url),
    converted: false,
    release: () => Promise.resolve(),
  };
}

// Both steps can fail on a video that is nonetheless a perfectly good file:
// a server that only answers its own player, or a codec ffmpeg cannot read.
const RECOVERABLE: readonly string[] = [FETCH_STAGE, CONVERT_STAGE];

function worthFallingBackOn(error: unknown, url: string): boolean {
  return (
    error instanceof ConversionError &&
    RECOVERABLE.includes(error.stage) &&
    mediaKind(url) === FILE_KIND
  );
}

// When the video cannot be fetched or cannot be converted, Chrome downloads it
// as it is, the way it always could, rather than the click coming to nothing.
// A playlist is only a list of pieces, so there is nothing to fall back to.
export class FallbackConverter implements VideoConverter {
  constructor(private readonly inner: VideoConverter) {}

  async convert(
    url: string,
    onProgress: StageProgressListener,
  ): Promise<VideoSource> {
    try {
      return await this.inner.convert(url, onProgress);
    } catch (error) {
      if (worthFallingBackOn(error, url)) {
        return asItIs(url);
      }
      throw error;
    }
  }
}
