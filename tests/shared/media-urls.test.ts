import { pathExtension } from "../../src/shared/media-urls";

describe("pathExtension", () => {
  it("is the extension on the path, whatever the query says", () => {
    expect(pathExtension("https://cdn.example/a/seg.TS?f=.mp4")).toBe("ts");
    expect(pathExtension("https://cdn.example/a/seg")).toBeUndefined();
    expect(pathExtension("not a url")).toBeUndefined();
  });
});
