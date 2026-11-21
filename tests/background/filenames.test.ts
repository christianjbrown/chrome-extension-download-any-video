import { kebab } from "../../src/background/filename-text";
import { SystemClock } from "../../src/background/system-clock";
import { VideoFilename } from "../../src/background/video-filename";

const MAX_STEM = 80;

describe("kebab", () => {
  it.each([
    [
      "Wallpaper of the day : r/Funnymemes",
      "wallpaper-of-the-day-r-funnymemes",
    ],
    ["  Café Déjà Vu!  ", "cafe-deja-vu"],
    ["ペンギン", "ペンギン"],
    ["...", ""],
    ["a".repeat(100), "a".repeat(MAX_STEM)],
    ["a".repeat(MAX_STEM - 1) + " b", "a".repeat(MAX_STEM - 1)],
  ])("turns %j into %j", (text, expected) => {
    expect(kebab(text, MAX_STEM)).toBe(expected);
  });
});

describe("VideoFilename", () => {
  const clock = { now: () => new Date(2026, 10, 9, 16, 5) };
  const names = new VideoFilename(clock, MAX_STEM);

  it("names the file after the time and the page, with the extension it is given", () => {
    expect(names.name("My Cool Page", "webm")).toBe(
      "2026-11-09-16-05-my-cool-page.webm",
    );
  });

  it("falls back to video and mp4 when the page and the source say nothing", () => {
    expect(names.name("", undefined)).toBe("2026-11-09-16-05-video.mp4");
  });
});

describe("SystemClock", () => {
  it("tells the time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 2, 3, 4));
    expect(new SystemClock().now()).toEqual(new Date(2026, 0, 2, 3, 4));
    vi.useRealTimers();
  });
});
