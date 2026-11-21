import type { ElementTree, Lineage, ShadowHost } from "./dom";

const EVERY_ELEMENT = "*";

// The elements of a tree, open shadow roots included, in document order.
export function allElements<E extends ShadowHost<E>>(
  tree: ElementTree<E>,
): E[] {
  return Array.from(tree.querySelectorAll(EVERY_ELEMENT)).flatMap((element) => [
    element,
    ...shadowElements(element),
  ]);
}

function shadowElements<E extends ShadowHost<E>>(element: E): E[] {
  return element.shadowRoot === null ? [] : allElements(element.shadowRoot);
}

// An element's ancestors, nearest first, climbing out of shadow roots through
// their hosts, so a player built from custom elements counts as one lineage.
export function ancestors<E extends Lineage<E>>(element: E): E[] {
  return lineageFrom(parentOf(element));
}

function lineageFrom<E extends Lineage<E>>(parent: E | undefined): E[] {
  return parent === undefined ? [] : [parent, ...ancestors(parent)];
}

function parentOf<E extends Lineage<E>>(element: E): E | undefined {
  return element.parentElement ?? hostOf(element);
}

// The host of the shadow root the element is in, when it is in one.
function hostOf<E extends Lineage<E>>(element: E): E | undefined {
  return element.getRootNode().host ?? undefined;
}
