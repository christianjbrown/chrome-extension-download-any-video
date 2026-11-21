import type { ElementTree, Lineage, ShadowHost } from "./dom";

const EVERY_ELEMENT = "*";

// The elements of a tree, open shadow roots included, in document order.
export function allElements<E extends ShadowHost<E>>(
  tree: ElementTree<E>,
): E[] {
  const found: E[] = [];
  for (const element of tree.querySelectorAll(EVERY_ELEMENT)) {
    found.push(element);
    if (element.shadowRoot !== null) {
      found.push(...allElements(element.shadowRoot));
    }
  }
  return found;
}

// An element's ancestors, nearest first, climbing out of shadow roots through
// their hosts, so a player built from custom elements counts as one lineage.
export function ancestors<E extends Lineage<E>>(element: E): E[] {
  const found: E[] = [];
  let current: E | null | undefined = parentOf(element);
  while (current !== null && current !== undefined) {
    found.push(current);
    current = parentOf(current);
  }
  return found;
}

function parentOf<E extends Lineage<E>>(element: E): E | null | undefined {
  return element.parentElement ?? element.getRootNode().host;
}
