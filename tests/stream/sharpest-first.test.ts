import { SharpestFirst } from "../../src/stream/sharpest-first";

describe("SharpestFirst", () => {
  const sizes = new SharpestFirst();

  it("takes the tallest, and among equals the one with the most bits", () => {
    const low = { height: 360, bandwidth: 9 };
    const tall = { height: 720, bandwidth: 1 };
    const richer = { height: 720, bandwidth: 2 };

    expect(sizes.best([low, tall, richer])).toBe(richer);
    expect(sizes.best([tall, low])).toBe(tall);
  });

  it("takes nothing from nothing", () => {
    const none: { height: number; bandwidth: number }[] = [];
    expect(sizes.best(none)).toBeUndefined();
  });
});
