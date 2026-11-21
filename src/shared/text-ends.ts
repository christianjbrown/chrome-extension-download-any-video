// The text with every trailing character that drop picks out taken off.
export function trimEndWhere(
  text: string,
  drop: (char: string) => boolean,
): string {
  // Just past the last character kept, or the start when none is.
  const end = text.split("").findLastIndex((char) => !drop(char)) + 1;
  return text.slice(0, end);
}
