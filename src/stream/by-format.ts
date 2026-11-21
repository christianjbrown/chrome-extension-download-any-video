import type { PlaylistFormat, PlaylistFormats } from "../shared/media-types";
import { NOT_A_PLAYLIST, type FormatChoice } from "./playlists";

// Each playlist format has its own handler; this picks the one for an address.
export class ByFormat<T> implements FormatChoice<T> {
  constructor(
    private readonly formats: PlaylistFormats,
    private readonly handlers: Readonly<Record<PlaylistFormat, T>>,
  ) {}

  handlerFor(url: string): T {
    const format = this.formats.formatOf(url);
    if (format === undefined) {
      throw new Error(NOT_A_PLAYLIST);
    }
    return this.handlers[format];
  }
}
