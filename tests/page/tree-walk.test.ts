import { allElements, ancestors } from "../../src/page/tree-walk";
import { element, tree } from "./fakes";

describe("allElements", () => {
  it("lists every element in document order, open shadow roots included", () => {
    const inner = element("video");
    const host = element("my-player", {
      shadow: [element("div", { children: [inner] })],
    });
    const after = element("p");
    const names = allElements(
      tree(element("main", { children: [host] }), after),
    ).map((found) => found.localName);

    expect(names).toEqual(["main", "my-player", "div", "video", "p"]);
  });
});

describe("ancestors", () => {
  it("climbs through parents and out of shadow roots through their hosts", () => {
    const inner = element("video");
    const wrapper = element("div", { children: [inner] });
    const host = element("my-player", { shadow: [wrapper] });
    const section = element("section", { children: [host] });
    element("body", { children: [section] });

    expect(ancestors(inner).map((found) => found.localName)).toEqual([
      "div",
      "my-player",
      "section",
      "body",
    ]);
  });

  it("is empty for the root", () => {
    expect(ancestors(element("html"))).toEqual([]);
  });
});
