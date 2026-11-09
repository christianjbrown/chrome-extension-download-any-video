import type { Box, Viewport } from "./dom";
import type { FoundVideo } from "./video-elements";

export interface VideoChooser {
  choose(videos: readonly FoundVideo[]): FoundVideo | undefined;
}

function visibleArea(box: Box, viewport: Viewport): number {
  const width =
    Math.min(box.left + box.width, viewport.width) - Math.max(box.left, 0);
  const height =
    Math.min(box.top + box.height, viewport.height) - Math.max(box.top, 0);
  return Math.max(width, 0) * Math.max(height, 0);
}

// The video the person is looking at: the one showing the most of itself on
// screen. A feed scrolls past many; the one in view is the one they mean.
export class VisibleVideoChooser implements VideoChooser {
  constructor(private readonly viewport: () => Viewport) {}

  choose(videos: readonly FoundVideo[]): FoundVideo | undefined {
    const viewport = this.viewport();
    let best: FoundVideo | undefined;
    let bestArea = 0;
    for (const video of videos) {
      const area = visibleArea(video.element.getBoundingClientRect(), viewport);
      if (best === undefined || area > bestArea) {
        best = video;
        bestArea = area;
      }
    }
    return best;
  }
}
