// The refusals Chrome words its own way, and what to say instead.
// Another refusal is another entry here. Part of the service worker's wiring.
import type { Translation } from "../background/chrome-errors";

const OWN_PAGES = "Chrome does not let extensions into its own pages";

export const CHROME_TRANSLATIONS: readonly Translation[] = [
  // Without the tabs permission Chrome hides its own pages' URLs from the
  // extension, so these only come to light when the injection is refused.
  { pattern: /^Cannot access a [a-z-]+:\/\/ URL/, message: OWN_PAGES },
  { pattern: /^Cannot access contents of url "chrome/, message: OWN_PAGES },
  {
    pattern: /extensions gallery cannot be scripted/,
    message: "Chrome does not let extensions into the Web Store",
  },
  {
    pattern: /^Cannot access contents of url "file:/,
    message:
      "Turn on Allow access to file URLs for this extension to use it on local files",
  },
  {
    pattern: /'activeTab' permission is required/,
    message: "Click the button on the tab that shows the video",
  },
];
