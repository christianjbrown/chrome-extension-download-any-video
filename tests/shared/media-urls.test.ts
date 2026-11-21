import { isWebUrl, pathExtension } from "../../src/shared/media-urls";

describe("pathExtension", () => {
  it("is the extension on the path, whatever the query says", () => {
    expect(pathExtension("https://cdn.example/a/seg.TS?f=.mp4")).toBe("ts");
    expect(pathExtension("https://cdn.example/a/seg")).toBeUndefined();
    expect(pathExtension("not a url")).toBeUndefined();
  });
});

describe("isWebUrl", () => {
  it("takes http and https only", () => {
    expect(isWebUrl("https://x.example/a.mp4")).toBe(true);
    expect(isWebUrl("HTTP://x.example/a.mp4")).toBe(true);
    expect(isWebUrl("blob:https://x.example/1")).toBe(false);
    expect(isWebUrl("")).toBe(false);
  });
});
