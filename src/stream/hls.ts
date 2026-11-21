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

// What reading a playlist gathers as it goes, in the parts each tag fills in.
// A tag that needs to remember something between lines keeps it itself.

export interface AudioRenditions extends Based {
  readonly audio: AudioRendition[];
}

export interface MasterReading extends AudioRenditions {
  readonly variants: Variant[];
}

export interface Encryption {
  encrypted: boolean;
}

export interface InitPiece extends Based {
  init: Piece | undefined;
}

export interface MediaReading extends Encryption, InitPiece {
  readonly segments: Piece[];
}

// One tag a playlist reader understands: each line that starts with it is
// handed to read, along with what the reading has gathered so far.
export interface HlsTag<R> {
  readonly tag: string;
  read(line: string, reading: R): void;
}

// What makes of each line that is neither a tag nor a comment, which is a URI.
export interface UriLine<R> {
  uri(uri: string, reading: R): void;
}

// The tags one playlist is read with, and what takes its URIs.
export interface PlaylistTags<R> {
  readonly tags: readonly HlsTag<R>[];
  readonly uris: UriLine<R>;
}

// The tags each kind of playlist is read with, fresh for every playlist so
// that what a tag remembers between lines never leaks into the next one.
// Another tag is another class and one more entry where the entry points list
// them.
export interface HlsTags {
  master(): PlaylistTags<MasterReading>;
  media(): PlaylistTags<MediaReading>;
}
