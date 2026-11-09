import { FETCH_STAGE } from "../shared/conversion-messages";
import { fileExtension, mediaKind } from "../shared/media-urls";
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
    release: () => Promise.resolve(),
  };
}

const WHOLE_FILE = "file";

// When the extension cannot fetch the video itself (a server that only answers
// the page, say), Chrome downloads it as it is, the way it always could. A
// playlist is only a list of pieces, so there is nothing to fall back to.
export class FallbackConverter implements VideoConverter {
  constructor(private readonly inner: VideoConverter) {}

  async convert(
    url: string,
    onProgress: StageProgressListener,
  ): Promise<VideoSource> {
    try {
      return await this.inner.convert(url, onProgress);
    } catch (error) {
      if (
        error instanceof ConversionError &&
        error.stage === FETCH_STAGE &&
        mediaKind(url) === WHOLE_FILE
      ) {
        return asItIs(url);
      }
      throw error;
    }
  }
}
