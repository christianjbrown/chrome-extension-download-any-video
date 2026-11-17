import { isSchemeReport } from "../../src/shared/scheme-messages";

describe("scheme messages", () => {
  it.each(["light", "dark"])("recognises a %s colour scheme", (scheme) => {
    expect(isSchemeReport({ type: "scheme", scheme })).toBe(true);
  });

  it.each(["sepia", 7, undefined])("refuses a %s colour scheme", (scheme) => {
    expect(isSchemeReport({ type: "scheme", scheme })).toBe(false);
  });

  it("refuses anything that is not a scheme report", () => {
    expect(isSchemeReport({ type: "progress", scheme: "dark" })).toBe(false);
    expect(isSchemeReport("scheme")).toBe(false);
    expect(isSchemeReport(null)).toBe(false);
  });
});
