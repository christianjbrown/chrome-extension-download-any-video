// The ways a DASH manifest names a representation's pieces, most specific
// first. Another way is another entry in DASH_PIECE_SOURCES.
import type { PieceSource } from "./dash";
import { ATTRIBUTES, ELEMENTS } from "./dash-names";
import { templatePieces } from "./dash-template";
import type { Piece } from "./tracks";
import { childNamed, childrenNamed, type XmlElement } from "./xml";

// "first-last", both byte positions inclusive.
const RANGE_SEPARATOR = "-";
// A piece without its own address is its base address.
const SAME_ADDRESS = "";
// A piece without a range is the whole of its address.
const WHOLE = "";

function piece(
  url: string | undefined,
  range: string | undefined,
  baseUrl: string,
): Piece {
  const positions = (range ?? WHOLE).split(RANGE_SEPARATOR);
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

// A list on the representation, or else on its set.
const SEGMENT_LIST: PieceSource = {
  pieces(set, representation, context) {
    const list =
      childNamed(representation, ELEMENTS.segmentList) ??
      childNamed(set, ELEMENTS.segmentList);
    return list === undefined ? undefined : listPieces(list, context.baseUrl);
  },
};

// The set's template with the representation's own laid over it, or either
// one alone.
const SEGMENT_TEMPLATE: PieceSource = {
  pieces(set, representation, context) {
    const setTemplate = childNamed(set, ELEMENTS.segmentTemplate);
    const ownTemplate = childNamed(representation, ELEMENTS.segmentTemplate);
    const template =
      setTemplate === undefined
        ? ownTemplate
        : merged(setTemplate, ownTemplate);
    return template === undefined
      ? undefined
      : templatePieces(template, context);
  },
};

export const DASH_PIECE_SOURCES: readonly PieceSource[] = [
  SEGMENT_LIST,
  SEGMENT_TEMPLATE,
];
