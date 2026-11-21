// What a URL's path looks like, before anything is made of it.
import { NOT_FOUND } from "./search";

const WEB_URL = /^https?:\/\//i;
const PATH_SEPARATOR = "/";
const EXTENSION_MARK = ".";

export function isWebUrl(url: string): boolean {
  return WEB_URL.test(url);
}

// The extension on the URL's path, lower case, or nothing when it has none.
export function pathExtension(url: string): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return undefined;
  }
  const last = pathname.slice(pathname.lastIndexOf(PATH_SEPARATOR) + 1);
  const dot = last.lastIndexOf(EXTENSION_MARK);
  return dot === NOT_FOUND ? undefined : last.slice(dot + 1).toLowerCase();
}
