// Settings for the service worker. Only its entry point reads them, and hands
// each one to the part that needs it.
export interface BackgroundConfig {
  // The longest the page title's part of a filename may be.
  maxStem: number;
}

export const BACKGROUND_CONFIG: BackgroundConfig = {
  maxStem: 80,
};
