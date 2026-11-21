import { WebUrls } from "../../src/shared/web-urls";

describe("WebUrls", () => {
  it("takes http and https only", () => {
    const urls = new WebUrls();
    expect(urls.matches("https://x.example/a.mp4")).toBe(true);
    expect(urls.matches("HTTP://x.example/a.mp4")).toBe(true);
    expect(urls.matches("blob:https://x.example/1")).toBe(false);
    expect(urls.matches("")).toBe(false);
  });
});
