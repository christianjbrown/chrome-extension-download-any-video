import type { ElementTree, Lineage, ShadowHost } from "./dom";
import type { ElementWalk, LineageWalk } from "./finder-parts";

const EVERY_ELEMENT = "*";

// The elements of a tree, open shadow roots included, in document order.
export class ShadowTreeWalk implements ElementWalk {
  all<E extends ShadowHost<E>>(tree: ElementTree<E>): E[] {
    return Array.from(tree.querySelectorAll(EVERY_ELEMENT)).flatMap(
      (element) => [element, ...this.shadowElements(element)],
    );
  }

  private shadowElements<E extends ShadowHost<E>>(element: E): E[] {
    return element.shadowRoot === null ? [] : this.all(element.shadowRoot);
  }
}

// An element's ancestors, nearest first, climbing out of shadow roots through
// their hosts, so a player built from custom elements counts as one lineage.
export class ShadowLineage implements LineageWalk {
  ancestors<E extends Lineage<E>>(element: E): E[] {
    return this.lineageFrom(parentOf(element));
  }

  private lineageFrom<E extends Lineage<E>>(parent: E | undefined): E[] {
    return parent === undefined ? [] : [parent, ...this.ancestors(parent)];
  }
}

function parentOf<E extends Lineage<E>>(element: E): E | undefined {
  return element.parentElement ?? hostOf(element);
}

// The host of the shadow root the element is in, when it is in one.
function hostOf<E extends Lineage<E>>(element: E): E | undefined {
  return element.getRootNode().host ?? undefined;
}
