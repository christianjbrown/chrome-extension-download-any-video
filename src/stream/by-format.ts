import type { PlaylistFormat, PlaylistFormats } from "../shared/media-types";
import type { FormatChoice } from "./playlists";
import type { StreamRefusals } from "./refusals";

// Each playlist format has its own handler; this picks the one for an address.
export class ByFormat<T> implements FormatChoice<T> {
  constructor(
    private readonly formats: PlaylistFormats,
    private readonly handlers: Readonly<Record<PlaylistFormat, T>>,
    private readonly refusals: Pick<StreamRefusals, "notAPlaylist">,
  ) {}

  handlerFor(url: string): T {
    const format = this.formats.formatOf(url);
    if (format === undefined) {
      throw new Error(this.refusals.notAPlaylist);
    }
    return this.handlers[format];
  }
}
