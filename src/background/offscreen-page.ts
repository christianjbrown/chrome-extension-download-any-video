// The extension's page to open offscreen, and what Chrome is told it is for.
export interface OffscreenPage {
  readonly url: string;
  readonly reasons: string[];
  readonly justification: string;
}
