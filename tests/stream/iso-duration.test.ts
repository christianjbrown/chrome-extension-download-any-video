import { durationSeconds } from "../../src/stream/iso-duration";

describe("durationSeconds", () => {
  it.each([
    ["PT1H2M3.5S", 3723.5],
    ["PT30S", 30],
    ["PT0H3M30.000S", 210],
    ["P1DT1S", 86401],
    ["P2D", 172800],
    ["PT", 0],
  ])("reads %s as %d seconds", (text, seconds) => {
    expect(durationSeconds(text)).toBe(seconds);
  });

  it.each([undefined, "", "1H", "PT1X", "P1Y", "PT1H2M3SX"])(
    "makes nothing of %j",
    (text) => {
      expect(durationSeconds(text)).toBeUndefined();
    },
  );
});
