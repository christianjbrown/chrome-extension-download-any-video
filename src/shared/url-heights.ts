import { UNKNOWN_HEIGHT } from "./candidates";
import type { HeightHints } from "./media-types";

// The range of heights video is actually made in, from 144p to 8K. A number
// outside it in a URL is an id or a date, not a height.
const SMALLEST_HEIGHT = 144;
const TALLEST_HEIGHT = 4320;
// Where the height sits in each pattern.
const HEIGHT_GROUP = 1;

function plausibleHeight(height: number): boolean {
  return height >= SMALLEST_HEIGHT && height <= TALLEST_HEIGHT;
}

// The height a URL's path and query advertise: the first pattern that finds
// a plausible one wins.
export class UrlHeights implements HeightHints {
  constructor(private readonly patterns: readonly RegExp[]) {}

  heightOf(url: string): number {
    for (const pattern of this.patterns) {
      const match = pattern.exec(url)?.[HEIGHT_GROUP];
      if (match !== undefined && plausibleHeight(Number(match))) {
        return Number(match);
      }
    }
    return UNKNOWN_HEIGHT;
  }
}
