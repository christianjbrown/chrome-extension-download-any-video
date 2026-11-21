// Page titles are somebody else's text, so nothing reaches a filename until
// it has been through this.
import { trimEndWhere } from "../shared/text-ends";
import type { Slugger } from "./download-steps";

// Latin accents only (é to e); other scripts' marks, like Japanese ペ, recombine.
const LATIN_ACCENTS = /[\u0300-\u036f]/g;
const NOT_A_WORD = /[^\p{L}\p{N}]+/u;
const SEPARATOR = "-";

// The words of the text, lower case and joined by dashes, cut to maxLength.
function kebab(text: string, maxLength: number): string {
  const words = text
    .normalize("NFKD")
    .replace(LATIN_ACCENTS, "")
    .normalize("NFC")
    .toLowerCase()
    .split(NOT_A_WORD)
    .filter((word) => word !== "");
  return trimDashes(words.join(SEPARATOR).slice(0, maxLength));
}

// Cutting to length can leave a dash on the end, and a name never ends on one.
function trimDashes(text: string): string {
  return trimEndWhere(text, (char) => char === SEPARATOR);
}

export class KebabSlugger implements Slugger {
  slug(text: string, maxLength: number): string {
    return kebab(text, maxLength);
  }
}
