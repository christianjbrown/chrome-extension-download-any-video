import type { DownloadCompletion } from "./download-steps";

interface DownloadDelta {
  id: number;
  state?: { current?: string | undefined } | undefined;
  error?: { current?: string | undefined } | undefined;
}

type DeltaListener = (delta: DownloadDelta) => void;

export interface DownloadEvents {
  onChanged: {
    addListener(listener: DeltaListener): void;
    removeListener(listener: DeltaListener): void;
  };
}

const COMPLETE = "complete";
const INTERRUPTED = "interrupted";
const NO_REASON = "no reason given";

const stopped = (reason: string): string =>
  `Chrome stopped the download (${reason})`;

// What becomes of the wait for one download once it ends.
interface Ending {
  landed(): void;
  stopped(reason: string): void;
}

function stateOf(delta: DownloadDelta): string | undefined {
  return delta.state?.current;
}

function errorOf(delta: DownloadDelta): string | undefined {
  return delta.error?.current;
}

function reasonOf(delta: DownloadDelta): string {
  return errorOf(delta) ?? NO_REASON;
}

// A change that is not the end of the download changes nothing.
function settle(delta: DownloadDelta, ending: Ending): void {
  if (stateOf(delta) === COMPLETE) {
    ending.landed();
    return;
  }
  stopIfInterrupted(delta, ending);
}

function stopIfInterrupted(delta: DownloadDelta, ending: Ending): void {
  if (stateOf(delta) === INTERRUPTED) {
    ending.stopped(reasonOf(delta));
  }
}

// Chrome says a download started; this waits for the file to actually land,
// so the button can say so, or say why it did not.
export class DownloadWatcher implements DownloadCompletion {
  constructor(private readonly downloads: DownloadEvents) {}

  finished(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ending: Ending = {
        landed: () => {
          this.downloads.onChanged.removeListener(listener);
          resolve();
        },
        stopped: (reason) => {
          this.downloads.onChanged.removeListener(listener);
          reject(new Error(stopped(reason)));
        },
      };
      const listener: DeltaListener = (delta) => {
        if (delta.id === id) {
          settle(delta, ending);
        }
      };
      this.downloads.onChanged.addListener(listener);
    });
  }
}
