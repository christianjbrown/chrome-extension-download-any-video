// Part of the offscreen document's wiring: why a stream cannot be downloaded,
// in words for the button's tooltip.
import type { StreamRefusals } from "../stream/refusals";

export const STREAM_REFUSALS: StreamRefusals = {
  encrypted: "This stream is encrypted, and this extension does not decrypt",
  live: "This is a live stream with no end, so there is no whole video to save",
  noStreams: "The playlist names no video to download",
  emptyPlaylist: "The playlist lists no pieces to download",
};
