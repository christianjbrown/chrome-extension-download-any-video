import {
  equalTo,
  fits,
  isArray,
  isNumber,
  isRecord,
  isString,
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
