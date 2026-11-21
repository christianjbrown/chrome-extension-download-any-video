// The little of an XML document the DASH reader uses, so it can be tested
// without a browser's DOMParser.

export interface XmlElement {
  readonly name: string;
  readonly text: string;
  readonly children: readonly XmlElement[];
  attribute(name: string): string | undefined;
}

// Parses a document and hands back its root element.
export type XmlParser = (text: string) => XmlElement;

export function childrenNamed(element: XmlElement, name: string): XmlElement[] {
  return element.children.filter((child) => child.name === name);
}

export function childNamed(
  element: XmlElement,
  name: string,
): XmlElement | undefined {
  return element.children.find((child) => child.name === name);
}

// Whether an element of that name sits anywhere below this one.
export function hasDescendantNamed(element: XmlElement, name: string): boolean {
  return element.children.some(
    (child) => child.name === name || hasDescendantNamed(child, name),
  );
}

// An attribute's value as a number, or the fallback when it is missing.
export function numberAttribute(
  element: XmlElement,
  name: string,
  fallback: number,
): number {
  return Number(element.attribute(name) ?? fallback);
}
