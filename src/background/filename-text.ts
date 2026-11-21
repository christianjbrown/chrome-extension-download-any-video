// Page titles are somebody else's text, so nothing reaches a filename until
// it has been through this.

const MAX_STEM = 80;
// Latin accents only (é to e); other scripts' marks, like Japanese ペ, recombine.
const LATIN_ACCENTS = /[\u0300-\u036f]/g;
const NOT_A_WORD = /[^\p{L}\p{N}]+/u;
const SEPARATOR = "-";

export function kebab(text: string): string {
  const words = text
    .normalize("NFKD")
    .replace(LATIN_ACCENTS, "")
    .normalize("NFC")
    .toLowerCase()
    .split(NOT_A_WORD)
    .filter((word) => word !== "");
  return trimDashes(words.join(SEPARATOR).slice(0, MAX_STEM));
}

// Cutting to length can leave a dash on the end, and a name never ends on one.
function trimDashes(text: string): string {
  let end = text.length;
  while (end > 0 && text.charAt(end - 1) === SEPARATOR) {
    end -= 1;
  }
  return text.slice(0, end);
}
