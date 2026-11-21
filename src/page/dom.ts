// The little of the DOM the page script uses, so each piece can be tested
// without a browser. Each finder depends on the role interfaces holding only
// what it reads; PageElement is all of them together, and a real element is
// one value that satisfies every role.

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
export interface ElementTree<E = PageElement> {
  querySelectorAll(selector: string): Iterable<E>;
}

interface Named {
  readonly localName: string;
}

// An element that may hold an open shadow root of further elements.
export interface ShadowHost<E> {
  readonly shadowRoot: ElementTree<E> | null;
}

export interface Attributed {
  getAttribute(name: string): string | null;
}

interface WithAttributes {
  readonly attributes: Iterable<Attribute>;
}

interface WithText {
  readonly textContent: string | null;
}

export interface Boxed {
  getBoundingClientRect(): Box;
}

// Where an element sits: its parent, or the host of the shadow root it is in.
export interface Lineage<E> {
  readonly parentElement: E | null;
  getRootNode(): { readonly host?: E | null | undefined };
}

// What a tree walk to find the videos reads of each element.
export interface ScannedElement extends Named, ShadowHost<ScannedElement> {}

// What the player attribute search reads: attributes, all the way up.
export interface PlayerElement extends WithAttributes, Lineage<PlayerElement> {}

// What the metadata search reads of a meta tag or a JSON-LD script.
export interface MetadataElement extends Attributed, WithText {}

export interface PageElement
  extends
    ElementTree,
    Named,
    ShadowHost<PageElement>,
    Attributed,
    WithAttributes,
    WithText,
    Boxed,
    Lineage<PageElement> {}

// A <video>, as found in the walk and then measured and climbed from. Its
// <source> children are only asked for their address.
export interface VideoElement extends ScannedElement, Boxed, PlayerElement {
  readonly currentSrc: string;
  readonly src: string;
  readonly videoHeight: number;
  querySelectorAll(selector: string): Iterable<Attributed>;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}
