// What the offscreen document tells the service worker about Chrome's colour
// scheme: which one it is in, when it starts looking and whenever it changes.
import { COLOUR_SCHEMES, type ColourScheme } from "./colour-scheme";

export const SCHEME_REPORT = "scheme";

export interface SchemeReport {
  readonly type: typeof SCHEME_REPORT;
  readonly scheme: ColourScheme;
}

export function isSchemeReport(message: unknown): message is SchemeReport {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const { type, scheme } = message as Record<string, unknown>;
  return (
    type === SCHEME_REPORT &&
    (COLOUR_SCHEMES as readonly unknown[]).includes(scheme)
  );
}
