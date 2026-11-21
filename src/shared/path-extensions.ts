import type { MediaTest, SavedExtensions } from "./media-types";
import { pathExtension } from "./media-urls";

// A download keeps the extension on the URL's path, for a URL that can be
// saved as it is. Anything else has no extension of its own to keep.
export class PathExtensions implements SavedExtensions {
  constructor(private readonly saveable: MediaTest) {}

  extensionOf(url: string): string | undefined {
    return this.saveable.matches(url) ? pathExtension(url) : undefined;
  }
}
