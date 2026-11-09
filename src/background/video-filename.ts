import { fileExtension } from "../shared/media-urls";
import { kebab } from "./filename-text";

export interface Clock {
  now(): Date;
}

export interface Filenames {
  name(title: string, url: string): string;
}

const FALLBACK_STEM = "video";
const FALLBACK_EXTENSION = "mp4";

function pad(number: number): string {
  return String(number).padStart(2, "0");
}

function stamp(date: Date): string {
  const day = `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

// "2026-11-09-16-05-my-cool-page.mp4", in the laptop's own time zone, so
// downloads sort by when they were taken. Servers name video files after
// encodings, not content, so the page title is the name every time.
export class VideoFilename implements Filenames {
  constructor(private readonly clock: Clock) {}

  name(title: string, url: string): string {
    const stem = kebab(title) || FALLBACK_STEM;
    const extension = fileExtension(url) ?? FALLBACK_EXTENSION;
    return `${stamp(this.clock.now())}-${stem}.${extension}`;
  }
}
