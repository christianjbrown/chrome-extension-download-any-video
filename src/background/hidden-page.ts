// The offscreen document, as the parts of the service worker that use it see it.

// The extension's one hidden page, as the things that use it see it.
export interface HiddenPage {
  // Makes sure the page is there, creating it if it is not.
  open(): Promise<void>;
  // Swaps the page for a fresh one, which drops everything the old one held.
  renew(): Promise<void>;
}

// The hidden page as a conversion sees it: there while anyone is converting.
export interface OffscreenHost {
  open(): Promise<void>;
  release(): Promise<void>;
}
