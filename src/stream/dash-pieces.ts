// The ways a DASH manifest names a representation's pieces. Another way is
// another class here and one more entry where the entry points list them.
import { ifDefined } from "../shared/optional";
import type { PieceSource, TemplateContext } from "./dash";
import { ATTRIBUTES, ELEMENTS } from "./dash-names";
import { templatePieces } from "./dash-template";
import type { ByteRange, Piece } from "./tracks";
import { childNamed, childrenNamed, type XmlElement } from "./xml";

// "first-last", both byte positions inclusive.
const RANGE_SEPARATOR = "-";
// A piece without its own address is its base address.
const SAME_ADDRESS = "";

function byteRange(range: string): ByteRange {
  const positions = range.split(RANGE_SEPARATOR);
  const first = Number(positions[0]);
  const last = Number(positions[1]);
  return { offset: first, length: last - first + 1 };
}

// A piece without a range is the whole of its address.
function piece(
  url: string | undefined,
  range: string | undefined,
  baseUrl: string,
): Piece {
  return {
    url: new URL(url ?? SAME_ADDRESS, baseUrl).href,
    range: ifDefined(range, byteRange),
  };
}

function initPieces(list: XmlElement, baseUrl: string): Piece[] {
  const initialization = childNamed(list, ELEMENTS.initialization);
  return initialization === undefined
    ? []
    : [
        piece(
          initialization.attribute(ATTRIBUTES.sourceUrl),
          initialization.attribute(ATTRIBUTES.range),
          baseUrl,
        ),
      ];
}

// A SegmentList names each piece itself.
function listPieces(list: XmlElement, baseUrl: string): Piece[] {
  return [
    ...initPieces(list, baseUrl),
    ...childrenNamed(list, ELEMENTS.segmentUrl).map((segment) =>
      piece(
        segment.attribute(ATTRIBUTES.media),
        segment.attribute(ATTRIBUTES.mediaRange),
        baseUrl,
      ),
    ),
  ];
}

// A representation's template fills in what the set's leaves out.
function merged(set: XmlElement, own: XmlElement | undefined): XmlElement {
  return own === undefined ? set : laidOver(set, own);
}

function laidOver(set: XmlElement, own: XmlElement): XmlElement {
  return {
    name: own.name,
    text: own.text,
    children: own.children.length === 0 ? set.children : own.children,
    attribute: (name) => own.attribute(name) ?? set.attribute(name),
  };
}

function listOf(
  set: XmlElement,
  representation: XmlElement,
): XmlElement | undefined {
  return (
    childNamed(representation, ELEMENTS.segmentList) ??
    childNamed(set, ELEMENTS.segmentList)
  );
}

function templateOf(
  set: XmlElement,
  representation: XmlElement,
): XmlElement | undefined {
  const setTemplate = childNamed(set, ELEMENTS.segmentTemplate);
  const ownTemplate = childNamed(representation, ELEMENTS.segmentTemplate);
  return setTemplate === undefined
    ? ownTemplate
    : merged(setTemplate, ownTemplate);
}

// A list on the representation, or else on its set.
export class SegmentListSource implements PieceSource {
  pieces(
    set: XmlElement,
    representation: XmlElement,
    context: TemplateContext,
  ): Piece[] | undefined {
    return ifDefined(listOf(set, representation), (list) =>
      listPieces(list, context.baseUrl),
    );
  }
}

// The set's template with the representation's own laid over it, or either
// one alone.
export class SegmentTemplateSource implements PieceSource {
  pieces(
    set: XmlElement,
    representation: XmlElement,
    context: TemplateContext,
  ): Piece[] | undefined {
    return ifDefined(templateOf(set, representation), (template) =>
      templatePieces(template, context),
    );
  }
}
