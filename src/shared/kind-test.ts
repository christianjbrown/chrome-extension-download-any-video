import type { MediaKind, MediaKinds, MediaTest } from "./media-types";

// Says yes to a URL of any of the kinds it is given, and no to a URL that is
// not a video at all.
export class KindTest implements MediaTest {
  constructor(
    private readonly kinds: MediaKinds,
    private readonly wanted: ReadonlySet<MediaKind>,
  ) {}

  matches(url: string): boolean {
    const kind = this.kinds.kindOf(url);
    return kind !== undefined && this.wanted.has(kind);
  }
}
