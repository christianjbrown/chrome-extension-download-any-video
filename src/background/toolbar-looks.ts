import type { Stage } from "../shared/conversion-messages";
import type {
  FinishedDownload,
  Look,
  StageTitles,
  ToolbarLooks,
} from "./toolbar";

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

function doneTitle(download: FinishedDownload): string {
  return download.converted
    ? `Downloaded ${download.filename}`
    : `Downloaded ${download.filename}, as the site served it: it could not be converted`;
}

// The button's badge, colour and tooltip at each point of a download, with
// each stage's tooltip handed in.
export class ButtonLooks implements ToolbarLooks {
  constructor(private readonly stageTitles: StageTitles) {}

  idle(): Look {
    return { badge: NO_BADGE, colour: GREY, title: IDLE_TITLE };
  }

  busy(): Look {
    return { badge: BUSY_BADGE, colour: BLUE, title: BUSY_TITLE };
  }

  progress(stage: Stage, ratio: number): Look {
    const shown = percent(ratio);
    return {
      badge: shown,
      colour: BLUE,
      title: this.stageTitles[stage].title(shown),
    };
  }

  done(download: FinishedDownload): Look {
    return { badge: DONE_BADGE, colour: BLUE, title: doneTitle(download) };
  }

  error(message: string): Look {
    return {
      badge: ERROR_BADGE,
      colour: RED,
      title: `Download failed: ${message}`,
    };
  }
}
