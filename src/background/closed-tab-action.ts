import { errorMessage } from "../shared/error-message";
import type { ToolbarAction } from "./toolbar-indicator";

// What Chrome says when a call names a tab that has already closed.
export const CLOSED_TAB_ERROR = /^No tab with id: \d+/;

async function unlessClosed(call: Promise<void>): Promise<void> {
  try {
    await call;
  } catch (error) {
    if (!CLOSED_TAB_ERROR.test(errorMessage(error))) {
      throw error;
    }
  }
}

// A tab can close between an event and the button being redrawn for it, and
// then there is no button left to redraw: that is nothing to report.
export class ClosedTabAction implements ToolbarAction {
  constructor(private readonly action: ToolbarAction) {}

  setBadgeText(details: { tabId: number; text: string }): Promise<void> {
    return unlessClosed(this.action.setBadgeText(details));
  }

  setBadgeBackgroundColor(details: {
    tabId: number;
    color: string;
  }): Promise<void> {
    return unlessClosed(this.action.setBadgeBackgroundColor(details));
  }

  setTitle(details: { tabId: number; title: string }): Promise<void> {
    return unlessClosed(this.action.setTitle(details));
  }
}
