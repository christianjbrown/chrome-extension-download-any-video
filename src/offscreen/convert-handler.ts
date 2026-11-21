import {
  PROGRESS_REPORT,
  type ConvertRequest,
  type ConvertResponse,
} from "../shared/conversion-messages";
import type {
  ConversionStages,
  ConvertHandling,
  ProgressSender,
  StageReporter,
} from "./conversion-parts";

// One conversion request, start to finish: the stages the entry point chains
// turn the requested URL into one to download, and each reports its progress.
export class ConvertHandler implements ConvertHandling {
  constructor(
    private readonly stages: ConversionStages<string, string>,
    private readonly progress: ProgressSender,
  ) {}

  async handle(request: ConvertRequest): Promise<ConvertResponse> {
    const outcome = await this.stages.run(
      request.url,
      this.reporter(request.jobId),
    );
    return outcome.ok ? { ok: true, url: outcome.value } : outcome;
  }

  private reporter(jobId: string): StageReporter {
    return (stage) => (ratio) => {
      this.progress.send({ type: PROGRESS_REPORT, jobId, stage, ratio });
    };
  }
}
