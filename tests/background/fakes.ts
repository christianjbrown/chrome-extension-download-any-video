import {
  ConvertingTitle,
  FetchingTitle,
} from "../../src/background/stage-titles";
import { ButtonLooks } from "../../src/background/toolbar-looks";
import type { ErrorExplainer } from "../../src/background/download-steps";
import type {
  DownloadIndicator,
  IdleIndicator,
} from "../../src/background/toolbar";
import {
  CONVERT_STAGE,
  FETCH_STAGE,
} from "../../src/shared/conversion-messages";
import type { Mocked } from "vitest";

export function fakeIndicator(): Mocked<IdleIndicator & DownloadIndicator> {
  return {
    showIdle: vi.fn<IdleIndicator["showIdle"]>().mockResolvedValue(undefined),
    showBusy: vi
      .fn<DownloadIndicator["showBusy"]>()
      .mockResolvedValue(undefined),
    showProgress: vi
      .fn<DownloadIndicator["showProgress"]>()
      .mockResolvedValue(undefined),
    showDone: vi
      .fn<DownloadIndicator["showDone"]>()
      .mockResolvedValue(undefined),
    showError: vi
      .fn<DownloadIndicator["showError"]>()
      .mockResolvedValue(undefined),
  };
}

export const plainErrors: ErrorExplainer = {
  explain: (error) => `explained: ${(error as Error).message}`,
};

// The button's looks, with the stage tooltips the entry point hands them.
export const looks = new ButtonLooks({
  [FETCH_STAGE]: new FetchingTitle(),
  [CONVERT_STAGE]: new ConvertingTitle(),
});
