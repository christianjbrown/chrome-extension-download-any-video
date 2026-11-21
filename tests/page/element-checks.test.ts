import { isVideoElement } from "../../src/page/element-checks";
import { element, video } from "./fakes";

// A video whose own fields are fine, with one field swapped for a bad value.
const videoWith = (field: string, value: unknown) =>
  ({ ...video(), [field]: value }) as never;

describe("isVideoElement", () => {
  it("takes a <video> with everything the finders read of one", () => {
    expect(isVideoElement(video())).toBe(true);
  });

  it("refuses another element, or a video missing what the finders read", () => {
    expect(isVideoElement(element("audio"))).toBe(false);
    expect(isVideoElement(element("video"))).toBe(false);
    expect(isVideoElement(videoWith("parentElement", "not an element"))).toBe(
      false,
    );
  });

  it("refuses attributes that are not a list of names and values", () => {
    expect(isVideoElement(videoWith("attributes", {}))).toBe(false);
    expect(isVideoElement(videoWith("attributes", [{ name: "src" }]))).toBe(
      false,
    );
    expect(isVideoElement(videoWith("attributes", ["src"]))).toBe(false);
  });

  it("refuses a video with no way to say what root it is in", () => {
    expect(isVideoElement(videoWith("getRootNode", undefined))).toBe(false);
    expect(isVideoElement(videoWith("getRootNode", () => "root"))).toBe(false);
    expect(
      isVideoElement(videoWith("getRootNode", () => ({ host: "host" }))),
    ).toBe(false);
  });

  it("checks every ancestor and shadow host on the way up", () => {
    const shadowed = video();
    const host = element("my-player", { shadow: [shadowed] });
    const nested = video();
    element("div", { children: [nested] });

    expect(isVideoElement(shadowed)).toBe(true);
    expect(isVideoElement(nested)).toBe(true);

    Object.assign(host, { attributes: "broken" });
    expect(isVideoElement(shadowed)).toBe(false);
    Object.assign(nested.parentElement!, { attributes: "broken" });
    expect(isVideoElement(nested)).toBe(false);
  });
});
