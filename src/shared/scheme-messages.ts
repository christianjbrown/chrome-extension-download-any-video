// What the offscreen document tells the service worker about Chrome's colour
// scheme: which one it is in, when it starts looking and whenever it changes.
import { isColourScheme, type ColourScheme } from "./colour-scheme";
import { equalTo, fits, isRecord, type Shape } from "./shape";

export const SCHEME_REPORT = "scheme";

export interface SchemeReport {
  readonly type: typeof SCHEME_REPORT;
  readonly scheme: ColourScheme;
}

const REPORT_SHAPE: Shape = {
  type: equalTo(SCHEME_REPORT),
  scheme: isColourScheme,
};

export function isSchemeReport(message: unknown): message is SchemeReport {
  return isRecord(message) && fits(message, REPORT_SHAPE);
}
