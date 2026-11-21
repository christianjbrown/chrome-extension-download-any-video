import { trimEndWhere } from "../../src/shared/text-ends";

const isDash = (char: string): boolean => char === "-";

describe("trimEndWhere", () => {
  it("takes every picked character off the end", () => {
    expect(trimEndWhere("a-b--", isDash)).toBe("a-b");
  });

  it("leaves the start and middle alone", () => {
    expect(trimEndWhere("-a-b", isDash)).toBe("-a-b");
  });

  it("leaves nothing of text made only of picked characters", () => {
    expect(trimEndWhere("---", isDash)).toBe("");
    expect(trimEndWhere("", isDash)).toBe("");
  });
});
