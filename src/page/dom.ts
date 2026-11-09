// The little of the DOM the page script uses, so each piece can be tested
// without a browser.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Attribute {
  readonly name: string;
  readonly value: string;
}

// A document or a shadow root: somewhere elements can be looked up.
export interface ElementTree {
  querySelectorAll(selector: string): Iterable<PageElement>;
}

export interface PageElement extends ElementTree {
  readonly localName: string;
  readonly attributes: Iterable<Attribute>;
  readonly parentElement: PageElement | null;
  readonly shadowRoot: ElementTree | null;
  readonly textContent: string | null;
  getAttribute(name: string): string | null;
  getBoundingClientRect(): Box;
  // The document, or the shadow root the element lives in, which knows its host.
  getRootNode(): { readonly host?: PageElement | null | undefined };
}

export interface VideoElement extends PageElement {
  readonly currentSrc: string;
  readonly src: string;
  readonly videoHeight: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}
