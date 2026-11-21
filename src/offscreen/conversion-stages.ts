// The stages a conversion runs through, as the toolbar button names them.
import type { Stage } from "../shared/conversion-messages";
import { errorMessage } from "../shared/error-message";
import type {
  ConversionStages,
  ConversionStep,
  StageOutcome,
  StageReporter,
} from "./conversion-parts";

// A step run as one named stage: its progress and its failure both carry the
// stage's name.
export class NamedStage<I, O> implements ConversionStages<I, O> {
  constructor(
    private readonly stage: Stage,
    private readonly step: ConversionStep<I, O>,
  ) {}

  async run(input: I, reporter: StageReporter): Promise<StageOutcome<O>> {
    try {
      return {
        ok: true,
        value: await this.step.run(input, reporter(this.stage)),
      };
    } catch (error) {
      return { ok: false, stage: this.stage, message: errorMessage(error) };
    }
  }
}

// One stage, then the next on what it handed on, stopping at the first that
// fails.
export class StageChain<I, M, O> implements ConversionStages<I, O> {
  constructor(
    private readonly first: ConversionStages<I, M>,
    private readonly then: ConversionStages<M, O>,
  ) {}

  async run(input: I, reporter: StageReporter): Promise<StageOutcome<O>> {
    const outcome = await this.first.run(input, reporter);
    return outcome.ok ? this.then.run(outcome.value, reporter) : outcome;
  }
}
