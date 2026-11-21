import { PathExtensions } from "../../src/shared/path-extensions";
import { extensions } from "./media";

describe("PathExtensions", () => {
  it("is the file's own extension, lower case", () => {
    expect(extensions.extensionOf("https://cdn.example/Clip.WebM")).toBe(
      "webm",
    );
  });

  it("is nothing for a playlist or a page", () => {
    expect(
      extensions.extensionOf("https://cdn.example/p.m3u8"),
    ).toBeUndefined();
    expect(
      extensions.extensionOf("https://cdn.example/p.html"),
    ).toBeUndefined();
  });

  it("asks the test it is given whether a URL keeps its extension", () => {
    const own = new PathExtensions({ matches: () => true });

    expect(own.extensionOf("https://x/v.m3u8")).toBe("m3u8");
  });
});
