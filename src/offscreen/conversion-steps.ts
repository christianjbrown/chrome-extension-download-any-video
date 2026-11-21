// The pieces of work a conversion is made of, as steps the entry point chains
// into stages.
import type {
  ConversionStep,
  Fetches,
  ObjectUrls,
  Transcodes,
} from "./conversion-parts";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";

// Fetches the video at the requested URL into memory.
export class FetchStep implements ConversionStep<string, MediaInputs> {
  constructor(private readonly fetcher: Fetches) {}

  run(url: string, onProgress: ProgressListener): Promise<MediaInputs> {
    return this.fetcher.fetch(url, onProgress);
  }
}

// Turns the fetched inputs into one MP4.
export class TranscodeStep implements ConversionStep<MediaInputs, Uint8Array> {
  constructor(private readonly transcoder: Transcodes) {}

  run(inputs: MediaInputs, onProgress: ProgressListener): Promise<Uint8Array> {
    return this.transcoder.transcode(inputs, onProgress);
  }
}

// Hands the converted bytes back as a URL Chrome can download.
export class ObjectUrlStep implements ConversionStep<Uint8Array, string> {
  constructor(private readonly urls: ObjectUrls) {}

  run(data: Uint8Array): Promise<string> {
    return Promise.resolve(this.urls.create(data));
  }
}

// One step, then another on what the first handed on.
export class StepChain<I, M, O> implements ConversionStep<I, O> {
  constructor(
    private readonly first: ConversionStep<I, M>,
    private readonly then: ConversionStep<M, O>,
  ) {}

  async run(input: I, onProgress: ProgressListener): Promise<O> {
    return this.then.run(await this.first.run(input, onProgress), onProgress);
  }
}
