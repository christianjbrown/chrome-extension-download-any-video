import {
  CONVERT_STAGE,
  FETCH_STAGE,
  type Stage,
} from "../shared/conversion-messages";

// What the toolbar button shows: the badge, its colour and the tooltip.
export interface Look {
  readonly badge: string;
  readonly colour: string;
  readonly title: string;
}

export interface FinishedDownload {
  readonly filename: string;
  // False when the file is the site's own, because converting it did not work.
  readonly converted: boolean;
}

// How the button looks at each point of a download.
export interface ToolbarLooks {
  idle(): Look;
  busy(): Look;
  progress(stage: Stage, ratio: number): Look;
  done(download: FinishedDownload): Look;
  error(message: string): Look;
}

const RED = "#dc2626";
const BLUE = "#1a73e8";
const GREY = "#5a5a60";

const NO_BADGE = "";
const BUSY_BADGE = "…";
const DONE_BADGE = "✓";
const ERROR_BADGE = "!";

const IDLE_TITLE = "Download the video on this page";
const BUSY_TITLE = "Looking for the video and downloading it";
const PERCENT = 100;

function percent(ratio: number): string {
  return `${String(Math.round(ratio * PERCENT))}%`;
}

const STAGE_TITLES: Readonly<Record<Stage, (shown: string) => string>> = {
  [FETCH_STAGE]: (shown) => `Fetching the video (${shown})`,
  [CONVERT_STAGE]: (shown) => `Converting the video to H.264 (${shown})`,
};

function doneTitle(download: FinishedDownload): string {
  return download.converted
    ? `Downloaded ${download.filename}`
    : `Downloaded ${download.filename}, as the site served it: it could not be converted`;
}

export const TOOLBAR_LOOKS: ToolbarLooks = {
  idle: () => ({ badge: NO_BADGE, colour: GREY, title: IDLE_TITLE }),
  busy: () => ({ badge: BUSY_BADGE, colour: BLUE, title: BUSY_TITLE }),
  progress: (stage, ratio) => {
    const shown = percent(ratio);
    return { badge: shown, colour: BLUE, title: STAGE_TITLES[stage](shown) };
  },
  done: (download) => ({
    badge: DONE_BADGE,
    colour: BLUE,
    title: doneTitle(download),
  }),
  error: (message) => ({
    badge: ERROR_BADGE,
    colour: RED,
    title: `Download failed: ${message}`,
  }),
};
