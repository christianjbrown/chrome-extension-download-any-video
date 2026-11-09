import {
  isConvertRequest,
  isConvertResponse,
  isProgressReport,
} from "../../src/shared/conversion-messages";

describe("conversion messages", () => {
  it("recognises a conversion request and nothing that only looks like one", () => {
    expect(
      isConvertRequest({
        type: "convert",
        jobId: "j1",
        url: "https://x/a.mp4",
      }),
    ).toBe(true);
    expect(isConvertRequest({ type: "convert", jobId: "j1" })).toBe(false);
    expect(isConvertRequest({ type: "progress", jobId: "j1", url: "u" })).toBe(
      false,
    );
    expect(isConvertRequest(null)).toBe(false);
    expect(isConvertRequest("convert")).toBe(false);
  });

  it("recognises a progress report with a known stage", () => {
    expect(
      isProgressReport({
        type: "progress",
        jobId: "j1",
        stage: "fetch",
        ratio: 0.5,
      }),
    ).toBe(true);
    expect(
      isProgressReport({
        type: "progress",
        jobId: "j1",
        stage: "upload",
        ratio: 0.5,
      }),
    ).toBe(false);
    expect(
      isProgressReport({ type: "progress", jobId: "j1", stage: "convert" }),
    ).toBe(false);
  });

  it("recognises both shapes of answer", () => {
    expect(isConvertResponse({ ok: true, url: "blob:x" })).toBe(true);
    expect(isConvertResponse({ ok: true })).toBe(false);
    expect(
      isConvertResponse({ ok: false, stage: "convert", message: "no" }),
    ).toBe(true);
    expect(isConvertResponse({ ok: false, stage: "nope", message: "no" })).toBe(
      false,
    );
    expect(isConvertResponse({ ok: "yes" })).toBe(false);
    expect(isConvertResponse(undefined)).toBe(false);
  });
});
