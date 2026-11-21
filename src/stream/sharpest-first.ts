import type { Sized, SizeChoice } from "./tracks";

function sharper(a: Sized, b: Sized): boolean {
  return (
    a.height > b.height || (a.height === b.height && a.bandwidth > b.bandwidth)
  );
}

// The tallest, and among equals the one with the most bits.
export class SharpestFirst implements SizeChoice {
  best<T extends Sized>(items: readonly T[]): T | undefined {
    return items.reduce<T | undefined>(
      (best, item) => (best === undefined || sharper(item, best) ? item : best),
      undefined,
    );
  }
}
