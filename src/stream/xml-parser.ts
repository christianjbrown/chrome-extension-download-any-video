// Reads the XML a DASH manifest is written in, so the manifest can be read
// where there is no DOMParser, as in a service worker. Manifests are written
// by machines, so this covers well-formed XML and nothing more forgiving.
import { NOT_FOUND } from "../shared/search";
import type { XmlElement } from "./xml";
import { decodeEntities } from "./xml-entities";

export const UNREADABLE_MANIFEST = "The video's manifest could not be read";

const OPEN = "<";
const CLOSE = ">";
const SLASH = "/";
const EQUALS = "=";
const COMMENT_START = "<!--";
const COMMENT_END = "-->";
const CDATA_START = "<![CDATA[";
const CDATA_END = "]]>";
const DECLARATION_START = "<!";
const INSTRUCTION_START = "<?";
const INSTRUCTION_END = "?>";
const CLOSING_TAG_START = "</";
const NAMESPACE_SEPARATOR = ":";
const QUOTES = ['"', "'"];
const WHITESPACE = /\s/;
const NAME_END = /[\s/>=]/;
export function parseXml(text: string): XmlElement {
  return new XmlScanner(text).document();
}

// An element as the scanner builds it. Its text is its own, not its
// children's, which is all a manifest's BaseURL needs.
class Element implements XmlElement {
  readonly children: Element[] = [];
  text = "";

  constructor(
    readonly name: string,
    private readonly attributes: ReadonlyMap<string, string>,
  ) {}

  addText(text: string): void {
    this.text += text;
  }

  attribute(name: string): string | undefined {
    return this.attributes.get(name);
  }
}

// What may sit around the root element, each skipped through its end.
const PROLOG_PARTS: readonly (readonly [string, string])[] = [
  [COMMENT_START, COMMENT_END],
  [INSTRUCTION_START, INSTRUCTION_END],
  [DECLARATION_START, CLOSE],
];

// How a part of an element's content starts, and what reading it does.
type ContentReaders = readonly (readonly [
  string,
  (element: Element) => void,
])[];

class XmlScanner {
  private at = 0;
  // Comments come before CDATA, which comes before any other markup, since
  // each starts the same way as the next.
  private readonly contentReaders: ContentReaders = [
    [
      COMMENT_START,
      () => {
        this.skipPast(COMMENT_END);
      },
    ],
    [
      CDATA_START,
      (element) => {
        element.addText(this.until(CDATA_START, CDATA_END));
      },
    ],
    [
      INSTRUCTION_START,
      () => {
        this.skipPast(INSTRUCTION_END);
      },
    ],
    [
      OPEN,
      (element) => {
        element.children.push(this.element());
      },
    ],
  ];

  constructor(private readonly text: string) {}

  document(): XmlElement {
    this.skipProlog();
    const root = this.element();
    this.skipProlog();
    if (this.at !== this.text.length) {
      throw unreadable();
    }
    return root;
  }

  // Declarations, processing instructions, comments and whitespace around
  // the root element.
  private skipProlog(): void {
    do {
      this.skipWhitespace();
    } while (this.skippedPrologPart());
  }

  private skippedPrologPart(): boolean {
    const part = PROLOG_PARTS.find(([start]) => this.lookingAt(start));
    if (part === undefined) {
      return false;
    }
    this.skipPast(part[1]);
    return true;
  }

  private element(): Element {
    this.expect(OPEN);
    const element = new Element(localName(this.name()), this.attributes());
    return this.lookingAt(SLASH)
      ? this.selfClosed(element)
      : this.withContent(element);
  }

  private selfClosed(element: Element): Element {
    this.at += SLASH.length;
    this.expect(CLOSE);
    return element;
  }

  private withContent(element: Element): Element {
    this.expect(CLOSE);
    this.content(element);
    this.expect(CLOSING_TAG_START);
    this.expectName(element.name);
    this.skipWhitespace();
    this.expect(CLOSE);
    return element;
  }

  private expectName(name: string): void {
    if (localName(this.name()) !== name) {
      throw unreadable();
    }
  }

  private attributes(): Map<string, string> {
    const found = new Map<string, string>();
    while (this.attributeAhead()) {
      const name = this.name();
      this.skipWhitespace();
      this.expect(EQUALS);
      this.skipWhitespace();
      found.set(name, this.quoted());
    }
    return found;
  }

  // Whether another attribute follows, past any whitespace before it.
  private attributeAhead(): boolean {
    this.skipWhitespace();
    return !this.lookingAt(SLASH) && !this.lookingAt(CLOSE);
  }

  // Everything between an element's tags: text, comments and child elements.
  private content(element: Element): void {
    while (!this.lookingAt(CLOSING_TAG_START)) {
      this.contentPart(element);
    }
  }

  private contentPart(element: Element): void {
    this.expectMore();
    const reader = this.contentReaders.find(([start]) => this.lookingAt(start));
    if (reader === undefined) {
      element.addText(decodeEntities(this.textUntil(OPEN)));
      return;
    }
    reader[1](element);
  }

  // An element still open at the end of the text was never closed.
  private expectMore(): void {
    if (this.at >= this.text.length) {
      throw unreadable();
    }
  }

  private name(): string {
    const start = this.at;
    this.skipWhile((char) => !NAME_END.test(char));
    return this.since(start);
  }

  // The text read since start, which a name cannot leave empty.
  private since(start: number): string {
    if (this.at === start) {
      throw unreadable();
    }
    return this.text.slice(start, this.at);
  }

  private quoted(): string {
    const quote = this.text.charAt(this.at);
    if (!QUOTES.includes(quote)) {
      throw unreadable();
    }
    this.at += quote.length;
    return decodeEntities(this.textThrough(quote));
  }

  // The text up to a marker, stopping at it.
  private textUntil(marker: string): string {
    const end = this.next(marker);
    const found = this.text.slice(this.at, end);
    this.at = end;
    return found;
  }

  // The text up to a marker, skipping the marker too.
  private textThrough(marker: string): string {
    const found = this.textUntil(marker);
    this.at += marker.length;
    return found;
  }

  // Where the marker next turns up, which it has to.
  private next(marker: string): number {
    const end = this.text.indexOf(marker, this.at);
    if (end === NOT_FOUND) {
      throw unreadable();
    }
    return end;
  }

  private until(start: string, end: string): string {
    this.at += start.length;
    return this.textThrough(end);
  }

  private skipPast(marker: string): void {
    this.textThrough(marker);
  }

  private skipWhitespace(): void {
    this.skipWhile((char) => WHITESPACE.test(char));
  }

  private skipWhile(test: (char: string) => boolean): void {
    while (this.nextPasses(test)) {
      this.at += 1;
    }
  }

  // Whether there is a character left, and it passes the test.
  private nextPasses(test: (char: string) => boolean): boolean {
    return this.at < this.text.length && test(this.text.charAt(this.at));
  }

  private lookingAt(marker: string): boolean {
    return this.text.startsWith(marker, this.at);
  }

  private expect(marker: string): void {
    if (!this.lookingAt(marker)) {
      throw unreadable();
    }
    this.at += marker.length;
  }
}

// The name without its namespace prefix, as a DOM's localName would be.
function localName(name: string): string {
  return name.slice(name.lastIndexOf(NAMESPACE_SEPARATOR) + 1);
}

function unreadable(): Error {
  return new Error(UNREADABLE_MANIFEST);
}
