import {
  CONVERT_STAGE,
  FETCH_STAGE,
  PROGRESS_REPORT,
  type ConvertRequest,
  type ConvertResponse,
  type ProgressReport,
  type Stage,
} from "../shared/conversion-messages";
import { errorMessage } from "../shared/error-message";
import type { ProgressListener } from "./progress";
import type { Transcodes } from "./transcoder";
import type { Fetches } from "./video-fetcher";

interface ProgressSender {
  send(report: ProgressReport): void;
}

interface ObjectUrls {
  // A URL Chrome can download, for bytes this document holds.
  create(data: Uint8Array): string;
}

export interface HandlerParts {
  readonly fetcher: Fetches;
  readonly transcoder: Transcodes;
  readonly urls: ObjectUrls;
  readonly progress: ProgressSender;
}

interface ConvertHandling {
  handle(request: ConvertRequest): Promise<ConvertResponse>;
}

function failure(stage: Stage, error: unknown): ConvertResponse {
  return { ok: false, stage, message: errorMessage(error) };
}

// One conversion request, start to finish: fetch, convert, hand back a URL.
export class ConvertHandler implements ConvertHandling {
  constructor(private readonly parts: HandlerParts) {}

  async handle(request: ConvertRequest): Promise<ConvertResponse> {
    let data: Uint8Array;
    try {
      data = await this.parts.fetcher.fetch(
        request.url,
        this.reporter(request.jobId, FETCH_STAGE),
      );
    } catch (error) {
      return failure(FETCH_STAGE, error);
    }
    try {
      const converted = await this.parts.transcoder.transcode(
        data,
        this.reporter(request.jobId, CONVERT_STAGE),
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
