// Page titles are somebody else's text, so nothing reaches a filename until
// it has been through this.

const MAX_STEM = 80;

export function kebab(text: string): string {
  const words = text
    .normalize("NFKD")
    // Latin accents only (é to e); other scripts' marks, like Japanese ペ, recombine.
    .replace(/[̀-ͯ]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "");
  return trimDashes(words.join("-").slice(0, MAX_STEM));
}

// Cutting to length can leave a dash on the end, and a name never ends on one.
function trimDashes(text: string): string {
  let end = text.length;
  while (end > 0 && text.charAt(end - 1) === "-") {
    end -= 1;
  }
  return text.slice(0, end);
}
