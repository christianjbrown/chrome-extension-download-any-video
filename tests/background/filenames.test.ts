import { kebab } from "../../src/background/filename-text";
import { SystemClock } from "../../src/background/system-clock";
import { VideoFilename } from "../../src/background/video-filename";

describe("kebab", () => {
  it.each([
    [
      "Wallpaper of the day : r/Funnymemes",
      "wallpaper-of-the-day-r-funnymemes",
    ],
    ["  Café Déjà Vu!  ", "cafe-deja-vu"],
    ["ペンギン", "ペンギン"],
    ["...", ""],
    ["a".repeat(100), "a".repeat(80)],
    ["a".repeat(79) + " b", "a".repeat(79)],
  ])("turns %j into %j", (text, expected) => {
    expect(kebab(text)).toBe(expected);
  });
});

describe("VideoFilename", () => {
  const clock = { now: () => new Date(2026, 10, 9, 16, 5) };
  const names = new VideoFilename(clock);

  it("names the file after the time and the page, with the file's own extension", () => {
    expect(
      names.name("My Cool Page", "https://cdn.example/x/clip.WebM?x=1"),
    ).toBe("2026-11-09-16-05-my-cool-page.webm");
  });

  it("falls back to video and mp4 when the page and the address say nothing", () => {
    expect(names.name("", "https://cdn.example/x/stream")).toBe(
      "2026-11-09-16-05-video.mp4",
    );
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
