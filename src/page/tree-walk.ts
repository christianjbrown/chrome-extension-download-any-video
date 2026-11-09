import type { ElementTree, PageElement } from "./dom";

// The elements of a tree, open shadow roots included, in document order.
export function allElements(tree: ElementTree): PageElement[] {
  const found: PageElement[] = [];
  for (const element of tree.querySelectorAll("*")) {
    found.push(element);
    if (element.shadowRoot !== null) {
      found.push(...allElements(element.shadowRoot));
    }
  }
  return found;
}

// An element's ancestors, nearest first, climbing out of shadow roots through
// their hosts, so a player built from custom elements counts as one lineage.
export function ancestors(element: PageElement): PageElement[] {
  const found: PageElement[] = [];
  let current: PageElement | null | undefined = parentOf(element);
  while (current !== null && current !== undefined) {
    found.push(current);
    current = parentOf(current);
  }
  return found;
}

function parentOf(element: PageElement): PageElement | null | undefined {
  return element.parentElement ?? element.getRootNode().host;
}
