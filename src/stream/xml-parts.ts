// The kinds of markup the XML scanner knows, one class each. Another kind is
// another class here and one more entry where the entry points list them.
import { CLOSE, OPEN } from "./xml-markers";
import type {
  ContentPart,
  ElementReader,
  MarkerSkipper,
  PrologPart,
  TextReader,
  XmlContent,
} from "./xml-reading";

const COMMENT_START = "<!--";
const COMMENT_END = "-->";
const CDATA_START = "<![CDATA[";
const CDATA_END = "]]>";
const DECLARATION_START = "<!";
const INSTRUCTION_START = "<?";
const INSTRUCTION_END = "?>";

// A comment says nothing, wherever it is.
export class CommentPart implements PrologPart, ContentPart {
  readonly start = COMMENT_START;

  skip(cursor: MarkerSkipper): void {
    cursor.skipPast(COMMENT_END);
  }

  read(cursor: MarkerSkipper): void {
    this.skip(cursor);
  }
}

// A processing instruction is for some other program.
export class InstructionPart implements PrologPart, ContentPart {
  readonly start = INSTRUCTION_START;

  skip(cursor: MarkerSkipper): void {
    cursor.skipPast(INSTRUCTION_END);
  }

  read(cursor: MarkerSkipper): void {
    this.skip(cursor);
  }
}

// A declaration, like a doctype, before the root element.
export class DeclarationPart implements PrologPart {
  readonly start = DECLARATION_START;

  skip(cursor: MarkerSkipper): void {
    cursor.skipPast(CLOSE);
  }
}

// Text kept exactly as written, entities and all.
export class CdataPart implements ContentPart {
  readonly start = CDATA_START;

  read(cursor: TextReader, into: XmlContent): void {
    into.addText(cursor.until(CDATA_START, CDATA_END));
  }
}

// Any other tag opens a child element.
export class ChildElementPart implements ContentPart {
  readonly start = OPEN;

  read(cursor: ElementReader, into: XmlContent): void {
    into.addChild(cursor.element());
  }
}
