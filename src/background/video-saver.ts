import type { DownloadCompletion, VideoDownloader } from "./download-steps";

// A file of the same name already there is kept, and this one is numbered.
const UNIQUIFY = "uniquify";

export interface DownloadStarter {
  download(options: {
    url: string;
    filename: string;
    saveAs: false;
    conflictAction: typeof UNIQUIFY;
  }): Promise<number>;
}

// Chrome does the saving, so the file lands like any other download: in the
// downloads folder, with the download shelf and history to match.
export class VideoSaver implements VideoDownloader {
  constructor(
    private readonly downloads: DownloadStarter,
    private readonly completion: DownloadCompletion,
  ) {}

  async save(url: string, filename: string): Promise<void> {
    const id = await this.downloads.download({
      url,
      filename,
      saveAs: false,
      conflictAction: UNIQUIFY,
    });
    await this.completion.finished(id);
  }
}
