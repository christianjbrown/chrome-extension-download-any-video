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
