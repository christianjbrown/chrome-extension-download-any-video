import { BACKGROUND_CONFIG } from "../../src/background/config";

describe("background config", () => {
  it("keeps the title part of a filename to 80 characters", () => {
    expect(BACKGROUND_CONFIG.maxStem).toBe(80);
  });
});
