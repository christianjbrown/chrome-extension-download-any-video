// Part of the entry points' wiring: the lists they build their objects from,
// kept here so the entry points that share one build it from one place.
import type { MediaType } from "../shared/extension-media";
import {
  DASH_FORMAT,
  FILE_KIND,
  HLS_FORMAT,
  PLAYLIST_KIND,
} from "../shared/media-types";

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
