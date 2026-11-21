import {
  asList,
  firstFound,
  ifDefined,
  required,
} from "../../src/shared/optional";

describe("ifDefined", () => {
  it("uses a value that is there", () => {
    expect(ifDefined(2, (value) => value * 3)).toBe(6);
  });

  it("gives nothing for a value that is not", () => {
    const use = vi.fn((value: number) => value);

    expect(ifDefined(undefined, use)).toBeUndefined();
    expect(use).not.toHaveBeenCalled();
  });
});

describe("firstFound", () => {
  it("gives the first answer and asks nothing after it", () => {
    const find = vi.fn((item: number) => (item > 1 ? item * 10 : undefined));

    expect(firstFound([1, 2, 3], find)).toBe(20);
    expect(find.mock.calls).toEqual([[1], [2]]);
  });

  it("gives nothing when no item has an answer", () => {
    expect(firstFound([1, 2], (): number | undefined => undefined)).toBe(
      undefined,
    );
  });
});

describe("required", () => {
  it("hands back a value that is there", () => {
    expect(required(0, "missing")).toBe(0);
  });

  it("says why when there is none", () => {
    expect(() => required<number>(undefined, "missing")).toThrow("missing");
  });
});

describe("asList", () => {
  it("makes a list of one of a value that is there", () => {
    expect(asList(0)).toEqual([0]);
  });

  it("makes an empty list of one that is not", () => {
    expect(asList(undefined)).toEqual([]);
  });
});
