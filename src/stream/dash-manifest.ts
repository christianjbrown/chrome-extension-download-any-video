// Reads a DASH manifest (an MPD): the representations of its first period,
// each with the pieces that make it up. DASH keeps picture and sound in
// separate representations.
import { ATTRIBUTES, ELEMENTS } from "./dash-names";
import { templatePieces, type TemplateContext } from "./dash-template";
import { durationSeconds } from "./iso-duration";
import {
  AUDIO_TRACK,
  UNKNOWN_SIZE,
  VIDEO_TRACK,
  type Piece,
  type Sized,
} from "./tracks";
import {
  childNamed,
  childrenNamed,
  hasDescendantNamed,
  type XmlElement,
} from "./xml";

// DASH keeps picture and sound apart, so a representation is one or the other.
const DASH_ROLES = [VIDEO_TRACK, AUDIO_TRACK] as const;
type DashRole = (typeof DASH_ROLES)[number];

export interface DashRepresentation extends Sized {
  readonly role: DashRole;
  readonly pieces: readonly Piece[];
}

export interface DashManifest {
  readonly live: boolean;
  readonly encrypted: boolean;
  readonly representations: readonly DashRepresentation[];
}

// The manifest type of a live stream, which keeps growing.
const DYNAMIC = "dynamic";
// "first-last", both byte positions inclusive.
const RANGE_SEPARATOR = "-";
// A representation without an id fills $RepresentationID$ with nothing.
const NO_ID = "";
// A piece without its own address is its base address.
const SAME_ADDRESS = "";

// A BaseURL child narrows the address everything below it is relative to.
function baseUrlOf(element: XmlElement, parent: string): string {
  const base = childNamed(element, ELEMENTS.baseUrl)?.text.trim();
  return base === undefined ? parent : new URL(base, parent).href;
}

// Picture or sound, from the set's or the representation's own word. Anything
// else, like subtitles, is not a track to download.
function roleOf(
  set: XmlElement,
  representation: XmlElement,
): DashRole | undefined {
  const type =
    set.attribute(ATTRIBUTES.contentType) ??
    representation.attribute(ATTRIBUTES.mimeType) ??
    set.attribute(ATTRIBUTES.mimeType) ??
    "";
  return DASH_ROLES.find((role) => type.startsWith(role));
}

function piece(
  url: string | undefined,
  range: string | undefined,
  baseUrl: string,
): Piece {
  const positions = (range ?? "").split(RANGE_SEPARATOR);
  const first = Number(positions[0]);
  const last = Number(positions[1]);
  return {
    url: new URL(url ?? SAME_ADDRESS, baseUrl).href,
    range:
      range === undefined
        ? undefined
        : { offset: first, length: last - first + 1 },
  };
}

// A SegmentList names each piece itself.
function listPieces(list: XmlElement, baseUrl: string): Piece[] {
  const pieces: Piece[] = [];
  const initialization = childNamed(list, ELEMENTS.initialization);
  if (initialization !== undefined) {
    pieces.push(
      piece(
        initialization.attribute(ATTRIBUTES.sourceUrl),
        initialization.attribute(ATTRIBUTES.range),
        baseUrl,
      ),
    );
  }
  for (const segment of childrenNamed(list, ELEMENTS.segmentUrl)) {
    pieces.push(
      piece(
        segment.attribute(ATTRIBUTES.media),
        segment.attribute(ATTRIBUTES.mediaRange),
        baseUrl,
      ),
    );
  }
  return pieces;
}

// A representation's template fills in what the set's leaves out.
function merged(set: XmlElement, own: XmlElement | undefined): XmlElement {
  if (own === undefined) {
    return set;
  }
  return {
    name: own.name,
    text: own.text,
    children: own.children.length === 0 ? set.children : own.children,
    attribute: (name) => own.attribute(name) ?? set.attribute(name),
  };
}

// A list, a template, or neither, in which case the representation is one
// whole file at its base address (SegmentBase, or nothing at all).
function representationPieces(
  set: XmlElement,
  representation: XmlElement,
  context: TemplateContext,
): Piece[] {
  const list =
    childNamed(representation, ELEMENTS.segmentList) ??
    childNamed(set, ELEMENTS.segmentList);
  if (list !== undefined) {
    return listPieces(list, context.baseUrl);
  }
  const setTemplate = childNamed(set, ELEMENTS.segmentTemplate);
  const ownTemplate = childNamed(representation, ELEMENTS.segmentTemplate);
  if (setTemplate !== undefined) {
    return templatePieces(merged(setTemplate, ownTemplate), context);
  }
  if (ownTemplate !== undefined) {
    return templatePieces(ownTemplate, context);
  }
  return [{ url: context.baseUrl, range: undefined }];
}

function setRepresentations(
  set: XmlElement,
  periodBase: string,
  periodSeconds: number | undefined,
): DashRepresentation[] {
  const setBase = baseUrlOf(set, periodBase);
  return childrenNamed(set, ELEMENTS.representation).flatMap(
    (representation) => {
      const role = roleOf(set, representation);
      if (role === undefined) {
        return [];
      }
      const bandwidth = Number(
        representation.attribute(ATTRIBUTES.bandwidth) ?? UNKNOWN_SIZE,
      );
      const context: TemplateContext = {
        representationId: representation.attribute(ATTRIBUTES.id) ?? NO_ID,
        bandwidth,
        baseUrl: baseUrlOf(representation, setBase),
        periodSeconds,
      };
      return [
        {
          role,
          bandwidth,
          height: Number(
            representation.attribute(ATTRIBUTES.height) ?? UNKNOWN_SIZE,
          ),
          pieces: representationPieces(set, representation, context),
        },
      ];
    },
  );
}

// The first period only: a single video is one period.
export function parseManifest(root: XmlElement, url: string): DashManifest {
  const live = root.attribute(ATTRIBUTES.type) === DYNAMIC;
  const encrypted = hasDescendantNamed(root, ELEMENTS.contentProtection);
  const period = childNamed(root, ELEMENTS.period);
  if (period === undefined) {
    return { live, encrypted, representations: [] };
  }
  const periodBase = baseUrlOf(period, baseUrlOf(root, url));
  const periodSeconds =
    durationSeconds(period.attribute(ATTRIBUTES.duration)) ??
    durationSeconds(root.attribute(ATTRIBUTES.presentationDuration));
  return {
    live,
    encrypted,
    representations: childrenNamed(period, ELEMENTS.adaptationSet).flatMap(
      (set) => setRepresentations(set, periodBase, periodSeconds),
    ),
  };
}
