// What a URL's path looks like, before anything is made of it.
import { ifDefined } from "./optional";
import { NOT_FOUND } from "./search";

const PATH_SEPARATOR = "/";
const EXTENSION_MARK = ".";

// The extension on the URL's path, lower case, or nothing when it has none.
export function pathExtension(url: string): string | undefined {
  return ifDefined(pathOf(url), extensionOfPath);
}

// The URL's path, or nothing when the text is not a URL at all.
function pathOf(url: string): string | undefined {
  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
}

function extensionOfPath(pathname: string): string | undefined {
  const last = pathname.slice(pathname.lastIndexOf(PATH_SEPARATOR) + 1);
  const dot = last.lastIndexOf(EXTENSION_MARK);
  return dot === NOT_FOUND ? undefined : last.slice(dot + 1).toLowerCase();
}
