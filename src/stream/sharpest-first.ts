import type { Sized, SizeChoice } from "./tracks";

function sharper(a: Sized, b: Sized): boolean {
  return a.height > b.height || richerAtSameHeight(a, b);
}

function richerAtSameHeight(a: Sized, b: Sized): boolean {
  return a.height === b.height && a.bandwidth > b.bandwidth;
}

// The first item is the best so far, and a later one only wins by being
// sharper.
function beats(item: Sized, best: Sized | undefined): boolean {
  return best === undefined || sharper(item, best);
}

// The tallest, and among equals the one with the most bits.
export class SharpestFirst implements SizeChoice {
  best<T extends Sized>(items: readonly T[]): T | undefined {
    return items.reduce<T | undefined>(
      (best, item) => (beats(item, best) ? item : best),
      undefined,
    );
  }
}
