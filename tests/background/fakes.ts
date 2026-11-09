import type { Mocked } from "vitest";
import type { ErrorExplainer } from "../../src/background/chrome-errors";
import type { DownloadIndicator } from "../../src/background/toolbar-indicator";

export function fakeIndicator(): Mocked<DownloadIndicator> {
  return {
    showIdle: vi
      .fn<DownloadIndicator["showIdle"]>()
      .mockResolvedValue(undefined),
    showBusy: vi
      .fn<DownloadIndicator["showBusy"]>()
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
