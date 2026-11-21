import type { Box, Viewport } from "./dom";
import type { Placed, VideoChooser } from "./finder-parts";

function visibleArea(box: Box, viewport: Viewport): number {
  const width =
    Math.min(box.left + box.width, viewport.width) - Math.max(box.left, 0);
  const height =
    Math.min(box.top + box.height, viewport.height) - Math.max(box.top, 0);
  return Math.max(width, 0) * Math.max(height, 0);
}

// A video and how much of it shows.
interface Shown<V> {
  readonly video: V;
  readonly area: number;
}

// The first video seen is the best so far, and a later one only wins by
// showing more.
function showsMore<V>(shown: Shown<V>, best: Shown<V> | undefined): boolean {
  return best === undefined || shown.area > best.area;
}

function most<V>(videos: readonly Shown<V>[]): Shown<V> | undefined {
  return videos.reduce<Shown<V> | undefined>(
    (best, shown) => (showsMore(shown, best) ? shown : best),
    undefined,
  );
}

// The video the person is looking at: the one showing the most of itself on
// screen. A feed scrolls past many; the one in view is the one they mean.
export class VisibleVideoChooser implements VideoChooser {
  constructor(private readonly viewport: () => Viewport) {}

  choose<V extends Placed>(videos: readonly V[]): V | undefined {
    const viewport = this.viewport();
    return most(
      videos.map((video) => ({
        video,
        area: visibleArea(video.element.getBoundingClientRect(), viewport),
      })),
    )?.video;
  }
}
