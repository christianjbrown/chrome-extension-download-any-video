import { errorMessage } from "../shared/error-message";
import type { ErrorExplainer } from "./download-steps";

// A refusal Chrome words its own way, and what to say instead.
export interface Translation {
  readonly pattern: RegExp;
  readonly message: string;
}

// Says what Chrome's terser refusals mean for the person who clicked.
// The first translation whose pattern matches wins; anything else is passed on
// as Chrome said it.
export class ChromeErrorExplainer implements ErrorExplainer {
  constructor(private readonly translations: readonly Translation[]) {}

  explain(error: unknown): string {
    const message = errorMessage(error);
    return this.translation(message) ?? message;
  }

  private translation(message: string): string | undefined {
    return this.translations.find(({ pattern }) => pattern.test(message))
      ?.message;
  }
}
