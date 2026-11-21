import { isVideoElement } from "../../src/page/element-checks";
import { element, video } from "./fakes";

describe("isVideoElement", () => {
  it("takes a <video> with everything the finders read of one", () => {
    expect(isVideoElement(video())).toBe(true);
  });

  it("refuses another element, or a video missing what it promises", () => {
    expect(isVideoElement(element("audio"))).toBe(false);
    expect(isVideoElement(element("video"))).toBe(false);
    expect(
      isVideoElement({ ...video(), parentElement: "not an element" } as never),
    ).toBe(false);
  });
});
