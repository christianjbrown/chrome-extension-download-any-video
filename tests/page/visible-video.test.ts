import type { Placed } from "../../src/page/finder-parts";
import { VisibleVideoChooser } from "../../src/page/visible-video";
import { video } from "./fakes";

const viewport = { width: 1000, height: 800 };

describe("VisibleVideoChooser", () => {
  const chooser = new VisibleVideoChooser(() => viewport);

  it("chooses the video showing the most of itself on screen", () => {
    const scrolledPast = video({
      box: { left: 0, top: -700, width: 600, height: 400 },
    });
    const inView = video({
      box: { left: 100, top: 100, width: 600, height: 400 },
    });
    const half = video({
      box: { left: 700, top: 600, width: 600, height: 400 },
    });
    const videos = [scrolledPast, inView, half].map((element) => ({
      element,
      candidates: [],
    }));

    expect(chooser.choose(videos)?.element).toBe(inView);
  });

  it("falls back to the first when none is on screen", () => {
    const first = video({ box: { left: 0, top: 2000, width: 10, height: 10 } });
    const second = video({
      box: { left: 0, top: 3000, width: 10, height: 10 },
    });
    const videos = [first, second].map((element) => ({
      element,
      candidates: [],
    }));

    expect(chooser.choose(videos)?.element).toBe(first);
  });

  it("chooses nothing from nothing", () => {
    expect(chooser.choose<Placed>([])).toBeUndefined();
  });
});
