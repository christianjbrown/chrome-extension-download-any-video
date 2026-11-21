// What a stream is made of once its playlist has been read: the pieces to
// fetch, grouped into the tracks they belong to. A player stitches these in
// memory as it plays; a download has to fetch them all and join them.

export interface ByteRange {
  readonly offset: number;
  readonly length: number;
}

// One fetch: a whole URL, or a slice of one.
export interface Piece {
  readonly url: string;
  readonly range: ByteRange | undefined;
}

// What a track carries. A muxed track has picture and sound together, which
// is how HLS usually ships; DASH keeps the two apart.
export const MUXED_TRACK = "muxed";
export const VIDEO_TRACK = "video";
export const AUDIO_TRACK = "audio";
export type TrackRole =
  typeof MUXED_TRACK | typeof VIDEO_TRACK | typeof AUDIO_TRACK;

export interface Track {
  readonly role: TrackRole;
  // Pieces in playing order. Fragmented MP4 puts its initialisation first;
  // joined in this order the bytes are one playable file.
  readonly pieces: readonly Piece[];
}

// A variant or representation that does not say how tall or how big it is.
export const UNKNOWN_SIZE = 0;

// Something offered at a size: a variant, a representation.
export interface Sized {
  readonly height: number;
  readonly bandwidth: number;
}

// Which of several sizes of the same video to download.
export interface SizeChoice {
  best<T extends Sized>(items: readonly T[]): T | undefined;
}
