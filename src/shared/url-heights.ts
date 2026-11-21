import { UNKNOWN_HEIGHT } from "./candidates";
import type { HeightHints } from "./media-types";
import { firstFound } from "./optional";

// The range of heights video is actually made in, from 144p to 8K. A number
// outside it in a URL is an id or a date, not a height.
const SMALLEST_HEIGHT = 144;
const TALLEST_HEIGHT = 4320;
// Where the height sits in each pattern.
const HEIGHT_GROUP = 1;

function plausibleHeight(height: number): boolean {
  return height >= SMALLEST_HEIGHT && height <= TALLEST_HEIGHT;
}

// The number where the pattern puts a height, or NaN when it finds none.
function numberIn(pattern: RegExp, url: string): number {
  return Number(pattern.exec(url)?.[HEIGHT_GROUP]);
}

// The height the pattern finds in the URL, when it finds a plausible one.
function heightIn(pattern: RegExp, url: string): number | undefined {
  const height = numberIn(pattern, url);
  return plausibleHeight(height) ? height : undefined;
}

// The height a URL's path and query advertise: the first pattern that finds
// a plausible one wins.
export class UrlHeights implements HeightHints {
  constructor(private readonly patterns: readonly RegExp[]) {}

  heightOf(url: string): number {
    return (
      firstFound(this.patterns, (pattern) => heightIn(pattern, url)) ??
      UNKNOWN_HEIGHT
    );
  }
}
