// What the button's tooltip says during each stage of a download.
import type { StageTitle } from "./toolbar";

export class FetchingTitle implements StageTitle {
  title(shown: string): string {
    return `Fetching the video (${shown})`;
  }
}

export class ConvertingTitle implements StageTitle {
  title(shown: string): string {
    return `Converting the video to H.264 (${shown})`;
  }
}
