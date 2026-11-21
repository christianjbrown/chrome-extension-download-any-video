// What an HLS playlist (RFC 8216) says, once read. A master playlist names
// variants of the same video at different sizes, each a media playlist; a
// media playlist lists the pieces of one variant.
import type { Piece } from "./tracks";

export interface Variant {
  readonly url: string;
  readonly height: number;
  readonly bandwidth: number;
  // The EXT-X-MEDIA group its sound comes from, when named.
  readonly audioGroup: string | undefined;
}

// A separately fetched sound track, which a variant names by group.
export interface AudioRendition {
  readonly group: string;
  readonly url: string;
  readonly isDefault: boolean;
}

export interface MasterPlaylist {
  readonly variants: readonly Variant[];
  readonly audio: readonly AudioRendition[];
}

export interface MediaPlaylist {
  readonly init: Piece | undefined;
  readonly segments: readonly Piece[];
  readonly encrypted: boolean;
}

export interface HlsParsing {
  // Whether the text is a master playlist rather than a media playlist.
  isMaster(text: string): boolean;
  master(text: string, baseUrl: string): MasterPlaylist;
  media(text: string, baseUrl: string): MediaPlaylist;
}

// A tag's NAME=value attributes, the quotes taken off quoted values.
export type Attributes = ReadonlyMap<string, string>;

// The playlist's own address, which the URIs in it are relative to.
interface Based {
  readonly baseUrl: string;
}

// What reading a playlist gathers as it goes, in the parts each tag needs.

export interface PendingVariant {
  // A variant's attributes, waiting for the URI on the line after them.
  pending: Attributes | undefined;
}

export interface AudioRenditions extends Based {
  readonly audio: AudioRendition[];
}

export interface MasterReading extends PendingVariant, AudioRenditions {
  readonly variants: Variant[];
}

export interface Encryption {
  encrypted: boolean;
}

export interface InitPiece extends Based {
  init: Piece | undefined;
}

export interface PendingRange {
  // A segment's byte range, waiting for the URI on a later line.
  pendingRange: string | undefined;
}

export interface MediaReading extends Encryption, InitPiece, PendingRange {
  readonly segments: Piece[];
  // Where the last segment ended, for a range that only gives a length.
  previousEnd: number;
}

// One tag a playlist reader understands: each line that starts with it is
// handed to read, along with what the reading has gathered so far.
export interface HlsTag<R> {
  readonly tag: string;
  read(line: string, reading: R): void;
}

// The tags each kind of playlist is read with. Another tag is another class
// and one more entry where the entry points list them.
export interface HlsTags {
  readonly master: readonly HlsTag<MasterReading>[];
  readonly media: readonly HlsTag<MediaReading>[];
}
