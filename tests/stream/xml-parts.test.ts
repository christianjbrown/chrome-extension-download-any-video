import {
  CdataPart,
  ChildElementPart,
  CommentPart,
  DeclarationPart,
  InstructionPart,
} from "../../src/stream/xml-parts";
import { xml } from "./fakes";

function cursor() {
  const child = xml("Child");
  return {
    child,
    skipPast: vi.fn(),
    until: vi.fn().mockReturnValue("raw <text>"),
    element: vi.fn().mockReturnValue(child),
  };
}

function content() {
  return { addText: vi.fn(), addChild: vi.fn() };
}

describe("the parts of XML", () => {
  it("skips comments and instructions through their ends, around the root or inside an element", () => {
    const at = cursor();

    new CommentPart().skip(at);
    new CommentPart().read(at);
    new InstructionPart().skip(at);
    new InstructionPart().read(at);

    expect(at.skipPast.mock.calls).toEqual([["-->"], ["-->"], ["?>"], ["?>"]]);
  });

  it("skips a declaration through its closing bracket", () => {
    const at = cursor();

    new DeclarationPart().skip(at);

    expect(at.skipPast).toHaveBeenCalledExactlyOnceWith(">");
  });

  it("keeps CDATA as the element's text", () => {
    const at = cursor();
    const into = content();

    new CdataPart().read(at, into);

    expect(at.until).toHaveBeenCalledWith("<![CDATA[", "]]>");
    expect(into.addText).toHaveBeenCalledWith("raw <text>");
  });

  it("reads any other tag as a child element", () => {
    const at = cursor();
    const into = content();

    new ChildElementPart().read(at, into);

    expect(into.addChild).toHaveBeenCalledWith(at.child);
  });

  it("each start where its markup does", () => {
    expect(
      [
        new CommentPart(),
        new CdataPart(),
        new InstructionPart(),
        new DeclarationPart(),
        new ChildElementPart(),
      ].map((part) => part.start),
    ).toEqual(["<!--", "<![CDATA[", "<?", "<!", "<"]);
  });
});
