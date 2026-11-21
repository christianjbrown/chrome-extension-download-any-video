import type {
  Attribute,
  Attributed,
  Box,
  Boxed,
  ElementTree,
  Lineage,
  Named,
  ShadowHost,
  VideoElement,
  WithAttributes,
  WithText,
} from "../../src/page/dom";

// Every role a page element plays, together, as a real element would be.
interface PageElement
  extends
    ElementTree<PageElement>,
    Named,
    ShadowHost<PageElement>,
    Attributed,
    WithAttributes,
    WithText,
    Boxed,
    Lineage<PageElement> {}

export interface FakeElement extends PageElement {
  readonly children: FakeElement[];
  parentElement: FakeElement | null;
  host: FakeElement | null;
  getRootNode(): { readonly host: FakeElement | null };
}

interface Options {
  attributes?: Record<string, string>;
  children?: FakeElement[];
  shadow?: FakeElement[];
  box?: Box;
  text?: string | null;
}

const NO_BOX: Box = { left: 0, top: 0, width: 0, height: 0 };
const SIMPLE_SELECTOR = /^(\*|[a-z-]+)(?:\[([a-z-]+)="([^"]*)"\])?$/;

function descendants(element: { children: FakeElement[] }): FakeElement[] {
  return element.children.flatMap((child) => [child, ...descendants(child)]);
}

// One simple selector: "*", a tag name, or tag[attr="value"].
function matchesOne(element: FakeElement, selector: string): boolean {
  const match = SIMPLE_SELECTOR.exec(selector);
  if (match === null) throw new Error(`unsupported selector ${selector}`);
  const [, tag, attribute, value] = match;
  if (tag !== "*" && element.localName !== tag) return false;
  if (attribute === undefined) return true;
  return element.getAttribute(attribute) === (value ?? null);
}

// Supports the selectors the page script uses: a comma list of simple ones.
function matching(roots: FakeElement[], selector: string): FakeElement[] {
  const all = roots.flatMap((root) => [root, ...descendants(root)]);
  const simple = selector.split(",").map((part) => part.trim());
  return all.filter((element) =>
    simple.some((part) => matchesOne(element, part)),
  );
}

function shadowRootOf(
  children: FakeElement[] | undefined,
): ElementTree<PageElement> | null {
  return children === undefined
    ? null
    : { querySelectorAll: (selector: string) => matching(children, selector) };
}

function adopt(fake: FakeElement, shadowChildren: FakeElement[]): void {
  for (const child of fake.children) {
    child.parentElement = fake;
  }
  for (const child of shadowChildren) {
    child.host = fake;
  }
}

export function element(localName: string, options: Options = {}): FakeElement {
  const attributes: Attribute[] = Object.entries(options.attributes ?? {}).map(
    ([name, value]) => ({ name, value }),
  );
  const fake: FakeElement = {
    localName,
    attributes,
    children: options.children ?? [],
    parentElement: null,
    host: null,
    textContent: options.text ?? null,
    shadowRoot: shadowRootOf(options.shadow),
    getAttribute: (name) =>
      attributes.find((attribute) => attribute.name === name)?.value ?? null,
    getBoundingClientRect: () => options.box ?? NO_BOX,
    getRootNode: () => ({ host: fake.host }),
    querySelectorAll: (selector) => matching(descendants(fake), selector),
  };
  adopt(fake, options.shadow ?? []);
  return fake;
}

// A document: looks things up among its top-level elements.
export function tree(...roots: FakeElement[]): ElementTree<PageElement> {
  return { querySelectorAll: (selector: string) => matching(roots, selector) };
}

interface VideoOptions extends Options {
  currentSrc?: string;
  src?: string;
  videoHeight?: number;
}

export function video(options: VideoOptions = {}): FakeElement & VideoElement {
  return Object.assign(element("video", options), {
    currentSrc: options.currentSrc ?? "",
    src: options.src ?? "",
    videoHeight: options.videoHeight ?? 0,
  });
}
