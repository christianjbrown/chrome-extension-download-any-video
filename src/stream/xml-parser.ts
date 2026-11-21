// Reads the XML a DASH manifest is written in, so the manifest can be read
// where there is no DOMParser, as in a service worker. Manifests are written
// by machines, so this covers well-formed XML and nothing more forgiving.
import { NOT_FOUND } from "../shared/search";
import type { XmlElement } from "./xml";

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
const ENTITY = /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi;
const NAMED_ENTITIES: ReadonlyMap<string, string> = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
]);
const HEX_PREFIX = "#x";
const DECIMAL_PREFIX = "#";
const HEX = 16;
const DECIMAL = 10;

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

class XmlScanner {
  private at = 0;

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
    for (;;) {
      this.skipWhitespace();
      if (this.lookingAt(COMMENT_START)) {
        this.skipPast(COMMENT_END);
      } else if (this.lookingAt(INSTRUCTION_START)) {
        this.skipPast(INSTRUCTION_END);
      } else if (this.lookingAt(DECLARATION_START)) {
        this.skipPast(CLOSE);
      } else {
        return;
      }
    }
  }

  private element(): Element {
    this.expect(OPEN);
    const element = new Element(localName(this.name()), this.attributes());
    if (this.lookingAt(SLASH)) {
      this.at += SLASH.length;
      this.expect(CLOSE);
      return element;
    }
    this.expect(CLOSE);
    this.content(element);
    this.expect(CLOSING_TAG_START);
    if (localName(this.name()) !== element.name) {
      throw unreadable();
    }
    this.skipWhitespace();
    this.expect(CLOSE);
    return element;
  }

  private attributes(): Map<string, string> {
    const found = new Map<string, string>();
    for (;;) {
      this.skipWhitespace();
      if (this.lookingAt(SLASH) || this.lookingAt(CLOSE)) {
        return found;
      }
      const name = this.name();
      this.skipWhitespace();
      this.expect(EQUALS);
      this.skipWhitespace();
      found.set(name, this.quoted());
    }
  }

  // Everything between an element's tags: text, comments and child elements.
  private content(element: Element): void {
    while (!this.lookingAt(CLOSING_TAG_START)) {
      if (this.at >= this.text.length) {
        throw unreadable();
      }
      if (this.lookingAt(COMMENT_START)) {
        this.skipPast(COMMENT_END);
      } else if (this.lookingAt(CDATA_START)) {
        element.addText(this.until(CDATA_START, CDATA_END));
      } else if (this.lookingAt(INSTRUCTION_START)) {
        this.skipPast(INSTRUCTION_END);
      } else if (this.lookingAt(OPEN)) {
        element.children.push(this.element());
      } else {
        element.addText(decodeEntities(this.textUntil(OPEN)));
      }
    }
  }

  private name(): string {
    const start = this.at;
    while (
      this.at < this.text.length &&
      !NAME_END.test(this.text.charAt(this.at))
    ) {
      this.at += 1;
    }
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
    return decodeEntities(this.textUntil(quote, true));
  }

  // The text up to a marker, which is skipped too when asked.
  private textUntil(marker: string, consume = false): string {
    const end = this.text.indexOf(marker, this.at);
    if (end === NOT_FOUND) {
      throw unreadable();
    }
    const found = this.text.slice(this.at, end);
    this.at = consume ? end + marker.length : end;
    return found;
  }

  private until(start: string, end: string): string {
    this.at += start.length;
    return this.textUntil(end, true);
  }

  private skipPast(marker: string): void {
    this.textUntil(marker, true);
  }

  private skipWhitespace(): void {
    while (
      this.at < this.text.length &&
      WHITESPACE.test(this.text.charAt(this.at))
    ) {
      this.at += 1;
    }
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

function decodeEntities(text: string): string {
  return text.replace(ENTITY, (_, entity: string) => {
    const lower = entity.toLowerCase();
    const named = NAMED_ENTITIES.get(lower);
    if (named !== undefined) {
      return named;
    }
    return lower.startsWith(HEX_PREFIX)
      ? String.fromCodePoint(parseInt(lower.slice(HEX_PREFIX.length), HEX))
      : String.fromCodePoint(
          parseInt(lower.slice(DECIMAL_PREFIX.length), DECIMAL),
        );
  });
}

function unreadable(): Error {
  return new Error(UNREADABLE_MANIFEST);
}
