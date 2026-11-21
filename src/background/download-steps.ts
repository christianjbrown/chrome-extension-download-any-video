// The steps of a download after a click, as the controller and the steps
// that lean on each other see them.
import type { FrameReport, VideoCandidate } from "../shared/candidates";

// The script that looks for the video in each frame of a tab.
export interface FrameAsker {
  // What every frame Chrome lets the extension into says, top frame first.
  ask(tabId: number): Promise<FrameReport[]>;
}

// Takes out of the frames' reports whatever should not be ranked.
export interface CandidateFilter {
  filter(reports: readonly FrameReport[]): Promise<FrameReport[]>;
}

// Picks the one candidate to download.
export interface Ranker {
  // The one to download, or why there is none.
  pick(reports: readonly FrameReport[]): VideoCandidate;
}

// What the downloaded file is called.
export interface Filenames {
  name(title: string, extension: string | undefined): string;
}

// The time now, as names are stamped with it.
export interface Clock {
  now(): Date;
}

// Has Chrome save a URL under a filename, until the file has landed.
export interface VideoDownloader {
  save(url: string, filename: string): Promise<void>;
}

export interface DownloadCompletion {
  // Settles when download `id` has finished, or failed.
  finished(id: number): Promise<void>;
}

// Words a failure for the person who clicked.
export interface ErrorExplainer {
  explain(error: unknown): string;
}

// Turns a page title into the part of a filename that names the video.
export interface Slugger {
  slug(text: string, maxLength: number): string;
}
