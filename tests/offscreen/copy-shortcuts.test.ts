import {
  CompatibleAudioCopy,
  CompatibleVideoCopy,
} from "../../src/offscreen/copy-shortcuts";

describe("CompatibleVideoCopy", () => {
  const shortcut = new CompatibleVideoCopy();

  it("copies H.264 with 4:2:0 colour", () => {
    expect(shortcut.suits({ codec: "h264", pixelFormat: "yuv420p" })).toBe(
      true,
    );
    expect(shortcut.args).toEqual(["-c:v", "copy"]);
  });

  it("leaves any other codec or pixel format to be re-encoded", () => {
    expect(shortcut.suits({ codec: "vp9", pixelFormat: "yuv420p" })).toBe(
      false,
    );
    expect(shortcut.suits({ codec: "h264", pixelFormat: "yuv444p" })).toBe(
      false,
    );
  });
});

describe("CompatibleAudioCopy", () => {
  const shortcut = new CompatibleAudioCopy();

  it("copies AAC and nothing else", () => {
    expect(shortcut.suits({ codec: "aac" })).toBe(true);
    expect(shortcut.suits({ codec: "opus" })).toBe(false);
    expect(shortcut.args).toEqual(["-c:a", "copy"]);
  });
});
