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

export interface DownloadCompletion {
  // Settles when download `id` has finished, or failed.
  finished(id: number): Promise<void>;
}

const COMPLETE = "complete";
const INTERRUPTED = "interrupted";

// Chrome says a download started; this waits for the file to actually land,
// so the button can say so, or say why it did not.
export class DownloadWatcher implements DownloadCompletion {
  constructor(private readonly downloads: DownloadEvents) {}

  finished(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const listener: DeltaListener = (delta) => {
        if (delta.id !== id) {
          return;
        }
        const state = delta.state?.current;
        if (state === COMPLETE) {
          this.downloads.onChanged.removeListener(listener);
          resolve();
        } else if (state === INTERRUPTED) {
          this.downloads.onChanged.removeListener(listener);
          reject(
            new Error(
              `Chrome stopped the download (${delta.error?.current ?? "no reason given"})`,
            ),
          );
        }
      };
      this.downloads.onChanged.addListener(listener);
    });
  }
}
