import { concatenate } from "../../src/offscreen/bytes";

describe("concatenate", () => {
  it("joins chunks in order", () => {
    expect(
      concatenate([
        new Uint8Array([1, 2]),
        new Uint8Array(),
        new Uint8Array([3]),
      ]),
    ).toEqual(new Uint8Array([1, 2, 3]));
    expect(concatenate([])).toEqual(new Uint8Array());
  });
});
