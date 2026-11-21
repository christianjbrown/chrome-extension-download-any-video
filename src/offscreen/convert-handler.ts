import {
  CONVERT_STAGE,
  FETCH_STAGE,
  PROGRESS_REPORT,
  type ConvertRequest,
  type ConvertResponse,
  type Stage,
} from "../shared/conversion-messages";
import { errorMessage } from "../shared/error-message";
import type {
  ConvertHandling,
  Fetches,
  ObjectUrls,
  ProgressSender,
  Transcodes,
} from "./conversion-parts";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";

export interface HandlerParts {
  readonly fetcher: Fetches;
  readonly transcoder: Transcodes;
  readonly urls: ObjectUrls;
  readonly progress: ProgressSender;
}

function failure(stage: Stage, error: unknown): ConvertResponse {
  return { ok: false, stage, message: errorMessage(error) };
}

// One conversion request, start to finish: fetch, convert, hand back a URL.
export class ConvertHandler implements ConvertHandling {
  constructor(private readonly parts: HandlerParts) {}

  async handle(request: ConvertRequest): Promise<ConvertResponse> {
    let data: MediaInputs;
    try {
      data = await this.parts.fetcher.fetch(
        request.url,
        this.reporter(request.jobId, FETCH_STAGE),
      );
    } catch (error) {
      return failure(FETCH_STAGE, error);
    }
    return this.converted(request.jobId, data);
  }

  private async converted(
    jobId: string,
    data: MediaInputs,
  ): Promise<ConvertResponse> {
    try {
      const converted = await this.parts.transcoder.transcode(
        data,
        this.reporter(jobId, CONVERT_STAGE),
      );
      return { ok: true, url: this.parts.urls.create(converted) };
    } catch (error) {
      return failure(CONVERT_STAGE, error);
    }
  }

  private reporter(jobId: string, stage: Stage): ProgressListener {
    return (ratio) => {
      this.parts.progress.send({ type: PROGRESS_REPORT, jobId, stage, ratio });
    };
  }
}
