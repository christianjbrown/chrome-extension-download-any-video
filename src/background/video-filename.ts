import { CONVERTED_EXTENSION } from "../shared/conversion-messages";
import type { Clock, Filenames, Slugger } from "./download-steps";

const FALLBACK_STEM = "video";
const FALLBACK_EXTENSION = CONVERTED_EXTENSION;
// Every part of the stamp but the year is two digits, so names sort by time.
const PART_WIDTH = 2;
const PAD = "0";

function pad(number: number): string {
  return String(number).padStart(PART_WIDTH, PAD);
}

function stamp(date: Date): string {
  const day = `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

// "2026-11-09-16-05-my-cool-page.mp4", in the laptop's own time zone, so
// downloads sort by when they were taken. Servers name video files after
// encodings, not content, so the page title is the name every time.
export class VideoFilename implements Filenames {
  constructor(
    private readonly clock: Clock,
    private readonly slugger: Slugger,
    // The longest the title part of the name may be.
    private readonly maxStem: number,
  ) {}

  name(title: string, extension: string | undefined): string {
    const stem = this.slugger.slug(title, this.maxStem) || FALLBACK_STEM;
    return `${stamp(this.clock.now())}-${stem}.${extension ?? FALLBACK_EXTENSION}`;
  }
}
