import { pathExtension } from "./media-urls";
import {
  DASH_FORMAT,
  FILE_KIND,
  HLS_FORMAT,
  PLAYLIST_KIND,
  type MediaKind,
  type MediaKinds,
  type PlaylistFormat,
  type PlaylistFormats,
  type SavedExtensions,
} from "./media-types";

// What an extension on a URL's path stands for.
export interface MediaType {
  readonly kind: MediaKind;
  // Which playlist it is, for a playlist.
  readonly format: PlaylistFormat | undefined;
}

const FILE: MediaType = { kind: FILE_KIND, format: undefined };

// Every extension a video turns up under. Another format is another entry.
export const MEDIA_EXTENSIONS: ReadonlyMap<string, MediaType> = new Map([
  ["mp4", FILE],
  ["m4v", FILE],
  ["mov", FILE],
  ["webm", FILE],
  ["ogv", FILE],
  ["mkv", FILE],
  ["m3u8", { kind: PLAYLIST_KIND, format: HLS_FORMAT }],
  ["mpd", { kind: PLAYLIST_KIND, format: DASH_FORMAT }],
]);

// Tells what a URL is from the extension on its path alone.
export class ExtensionMedia
  implements MediaKinds, PlaylistFormats, SavedExtensions
{
  constructor(private readonly types: ReadonlyMap<string, MediaType>) {}

  kindOf(url: string): MediaKind | undefined {
    return this.typeOf(url)?.kind;
  }

  formatOf(url: string): PlaylistFormat | undefined {
    return this.typeOf(url)?.format;
  }

  extensionOf(url: string): string | undefined {
    return this.kindOf(url) === FILE_KIND ? pathExtension(url) : undefined;
  }

  private typeOf(url: string): MediaType | undefined {
    const extension = pathExtension(url);
    return extension === undefined ? undefined : this.types.get(extension);
  }
}
