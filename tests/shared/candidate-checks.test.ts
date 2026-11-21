import { isCandidate, isFrameReport } from "../../src/shared/candidate-checks";

const candidate = {
  url: "https://cdn.example/a.mp4",
  origin: "player",
  height: 720,
};

describe("isCandidate", () => {
  it("takes a candidate with every field it promises", () => {
    expect(isCandidate(candidate)).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isCandidate(null)).toBe(false);
    expect(isCandidate({ ...candidate, origin: "rumour" })).toBe(false);
    expect(isCandidate({ ...candidate, height: "720" })).toBe(false);
    expect(isCandidate({ ...candidate, url: undefined })).toBe(false);
  });
});

describe("isFrameReport", () => {
  it("takes a title with a list of candidates", () => {
    expect(isFrameReport({ title: "Top", candidates: [candidate] })).toBe(true);
  });

  it("refuses a report whose candidates are not all candidates", () => {
    expect(isFrameReport({ title: "Top", candidates: [{}] })).toBe(false);
    expect(isFrameReport({ title: 5, candidates: [] })).toBe(false);
    expect(isFrameReport("Top")).toBe(false);
  });
});
