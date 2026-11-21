// What a DASH manifest (an MPD) says, once read: the representations of its
// first period, each with the pieces that make it up. DASH keeps picture and
// sound in separate representations.
import { AUDIO_TRACK, VIDEO_TRACK, type Piece, type Sized } from "./tracks";
import type { XmlElement } from "./xml";

// DASH keeps picture and sound apart, so a representation is one or the other.
export const DASH_ROLES = [VIDEO_TRACK, AUDIO_TRACK] as const;
export type DashRole = (typeof DASH_ROLES)[number];

export interface DashRepresentation extends Sized {
  readonly role: DashRole;
  readonly pieces: readonly Piece[];
}

export interface DashManifest {
  readonly live: boolean;
  readonly encrypted: boolean;
  readonly representations: readonly DashRepresentation[];
}

export interface DashParsing {
  parse(text: string, url: string): DashManifest;
}

// What naming a representation's pieces needs to know about it.
export interface TemplateContext {
  readonly representationId: string;
  readonly bandwidth: number;
  readonly baseUrl: string;
  // The period's length in seconds, when the manifest says.
  readonly periodSeconds: number | undefined;
}

// One way a manifest can name a representation's pieces: a list, a template.
// It answers nothing when the representation does not use it.
export interface PieceSource {
  pieces(
    set: XmlElement,
    representation: XmlElement,
    context: TemplateContext,
  ): Piece[] | undefined;
}
