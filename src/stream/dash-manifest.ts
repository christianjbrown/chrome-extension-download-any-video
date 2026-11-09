// Reads a DASH manifest (an MPD): the representations of its first period,
// each with the pieces that make it up. DASH keeps picture and sound in
// separate representations.
import { templatePieces, type TemplateContext } from "./dash-template";
import { durationSeconds } from "./iso-duration";
import type { Piece, Sized } from "./tracks";
import {
  childNamed,
  childrenNamed,
  hasDescendantNamed,
  type XmlElement,
} from "./xml";

type DashRole = "video" | "audio";

export interface DashRepresentation extends Sized {
  readonly role: DashRole;
  readonly pieces: readonly Piece[];
}

export interface DashManifest {
  readonly live: boolean;
  readonly encrypted: boolean;
  readonly representations: readonly DashRepresentation[];
}

const DYNAMIC = "dynamic";
const VIDEO = "video";
const AUDIO = "audio";

// A BaseURL child narrows the address everything below it is relative to.
function baseUrlOf(element: XmlElement, parent: string): string {
  const base = childNamed(element, "BaseURL")?.text.trim();
  return base === undefined ? parent : new URL(base, parent).href;
}

// Picture or sound, from the set's or the representation's own word. Anything
// else, like subtitles, is not a track to download.
function roleOf(
  set: XmlElement,
  representation: XmlElement,
): DashRole | undefined {
  const type =
    set.attribute("contentType") ??
    representation.attribute("mimeType") ??
    set.attribute("mimeType") ??
    "";
  if (type.startsWith(VIDEO)) {
    return VIDEO;
  }
  return type.startsWith(AUDIO) ? AUDIO : undefined;
}

// "first-last", both byte positions inclusive.
function piece(
  url: string | undefined,
  range: string | undefined,
  baseUrl: string,
): Piece {
  const positions = (range ?? "").split("-");
  const first = Number(positions[0]);
  const last = Number(positions[1]);
  return {
    url: new URL(url ?? "", baseUrl).href,
    range:
      range === undefined
        ? undefined
        : { offset: first, length: last - first + 1 },
  };
}

// A SegmentList names each piece itself.
function listPieces(list: XmlElement, baseUrl: string): Piece[] {
  const pieces: Piece[] = [];
  const initialization = childNamed(list, "Initialization");
  if (initialization !== undefined) {
    pieces.push(
      piece(
        initialization.attribute("sourceURL"),
        initialization.attribute("range"),
        baseUrl,
      ),
    );
  }
  for (const segment of childrenNamed(list, "SegmentURL")) {
    pieces.push(
      piece(
        segment.attribute("media"),
        segment.attribute("mediaRange"),
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
    childNamed(representation, "SegmentList") ?? childNamed(set, "SegmentList");
  if (list !== undefined) {
    return listPieces(list, context.baseUrl);
  }
  const setTemplate = childNamed(set, "SegmentTemplate");
  const ownTemplate = childNamed(representation, "SegmentTemplate");
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
  return childrenNamed(set, "Representation").flatMap((representation) => {
    const role = roleOf(set, representation);
    if (role === undefined) {
      return [];
    }
    const bandwidth = Number(representation.attribute("bandwidth") ?? 0);
    const context: TemplateContext = {
      representationId: representation.attribute("id") ?? "",
      bandwidth,
      baseUrl: baseUrlOf(representation, setBase),
      periodSeconds,
    };
    return [
      {
        role,
        bandwidth,
        height: Number(representation.attribute("height") ?? 0),
        pieces: representationPieces(set, representation, context),
      },
    ];
  });
}

// The first period only: a single video is one period.
export function parseManifest(root: XmlElement, url: string): DashManifest {
  const live = root.attribute("type") === DYNAMIC;
  const encrypted = hasDescendantNamed(root, "ContentProtection");
  const period = childNamed(root, "Period");
  if (period === undefined) {
    return { live, encrypted, representations: [] };
  }
  const periodBase = baseUrlOf(period, baseUrlOf(root, url));
  const periodSeconds =
    durationSeconds(period.attribute("duration")) ??
    durationSeconds(root.attribute("mediaPresentationDuration"));
  return {
    live,
    encrypted,
    representations: childrenNamed(period, "AdaptationSet").flatMap((set) =>
      setRepresentations(set, periodBase, periodSeconds),
    ),
  };
}
