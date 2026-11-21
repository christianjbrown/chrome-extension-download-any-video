import {
  absentOr,
  equalTo,
  everyIterated,
  everyItem,
  fits,
  isArray,
  isFunction,
  isIterable,
  isNumber,
  isRecord,
  isString,
  oneOf,
} from "../../src/shared/shape";

describe("isRecord", () => {
  it("takes an object", () => {
    expect(isRecord({})).toBe(true);
  });

  it("refuses null and anything that is not an object", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord("text")).toBe(false);
  });
});

describe("field tests", () => {
  it("tell strings, numbers and arrays from anything else", () => {
    expect([isString("a"), isString(1)]).toEqual([true, false]);
    expect([isNumber(1), isNumber("1")]).toEqual([true, false]);
    expect([isArray([]), isArray({})]).toEqual([true, false]);
  });

  it("match one value exactly", () => {
    expect([equalTo(true)(true), equalTo(true)("true")]).toEqual([true, false]);
  });
});

describe("fits", () => {
  const shape = { name: isString, size: isNumber };

  it("takes a record whose every field passes", () => {
    expect(fits({ name: "a", size: 1, extra: null }, shape)).toBe(true);
  });

  it("refuses a record with a field that fails or is missing", () => {
    expect(fits({ name: "a", size: "1" }, shape)).toBe(false);
    expect(fits({ name: "a" }, shape)).toBe(false);
  });
});

describe("list and set tests", () => {
  it("take a list only when every item passes", () => {
    const strings = everyItem(isString);
    expect([strings(["a"]), strings(["a", 1]), strings("a")]).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("take one of a closed set of values", () => {
    const sizes = oneOf(["s", "m"]);
    expect([sizes("m"), sizes("l")]).toEqual([true, false]);
  });
});

describe("function and nullable tests", () => {
  it("tell a function from anything else", () => {
    expect([isFunction(() => 1), isFunction({})]).toEqual([true, false]);
  });

  it("take nothing at all, or a value that passes", () => {
    const absentOrString = absentOr(isString);
    expect([
      absentOrString(null),
      absentOrString(undefined),
      absentOrString("x"),
      absentOrString(1),
    ]).toEqual([true, true, true, false]);
  });
});

describe("iterable tests", () => {
  it("take what for...of can walk, and nothing else", () => {
    expect([
      isIterable([]),
      isIterable(new Set()),
      isIterable({}),
      isIterable("text"),
    ]).toEqual([true, true, false, false]);
  });

  it("check every item of a collection", () => {
    const strings = everyIterated(isString);
    expect([
      strings(new Set(["a", "b"])),
      strings(["a", 1]),
      strings({ length: 0 }),
    ]).toEqual([true, false, false]);
  });
});
