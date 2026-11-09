import type { Stage } from "../shared/conversion-messages";

// A video ready for Chrome to download, held until the download has landed.
export interface VideoSource {
  readonly url: string;
  // What the filename should end in, when the source knows.
  readonly extension: string | undefined;
  // False when this is the site's own file because converting it did not work.
  readonly converted: boolean;
  release(): Promise<void>;
}

export type StageProgressListener = (stage: Stage, ratio: number) => void;

export interface VideoConverter {
  convert(url: string, onProgress: StageProgressListener): Promise<VideoSource>;
}

// A conversion that got as far as `stage` and no further.
export class ConversionError extends Error {
  constructor(
    readonly stage: Stage,
    message: string,
  ) {
    super(message);
    this.name = "ConversionError";
  }
}
