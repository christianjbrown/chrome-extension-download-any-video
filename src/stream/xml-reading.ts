// What reading XML is made of, as the parts of a document see the scanner
// reading it.
import type { XmlElement } from "./xml";

// Skips through the next marker.
export interface MarkerSkipper {
  skipPast(marker: string): void;
}

// The text between a start marker and the next end marker.
export interface TextReader {
  until(start: string, end: string): string;
}

// Reads the element that starts here, with everything inside it.
export interface ElementReader {
  element(): XmlElement;
}

export interface XmlCursor extends MarkerSkipper, TextReader, ElementReader {}

// The element whose content is being read.
export interface XmlContent {
  addText(text: string): void;
  addChild(child: XmlElement): void;
}

// Something that may sit around the root element, and how to step over it.
export interface PrologPart {
  readonly start: string;
  skip(cursor: XmlCursor): void;
}

// Something that may start inside an element, and how to read it.
export interface ContentPart {
  readonly start: string;
  read(cursor: XmlCursor, into: XmlContent): void;
}

// The parts the scanner knows, each list tried in order, so a part whose
// start begins another's goes first.
export interface XmlParts {
  readonly prolog: readonly PrologPart[];
  readonly content: readonly ContentPart[];
}
