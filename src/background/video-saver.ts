import type { DownloadCompletion } from "./download-completion";

export interface DownloadStarter {
  download(options: {
    url: string;
    filename: string;
    saveAs: false;
    conflictAction: "uniquify";
  }): Promise<number>;
}

export interface VideoDownloader {
  save(url: string, filename: string): Promise<void>;
}

// Chrome fetches the video itself, with the browser's own cookies and no CORS,
// so whatever the page could play can be saved.
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
      conflictAction: "uniquify",
    });
    await this.completion.finished(id);
  }
}
