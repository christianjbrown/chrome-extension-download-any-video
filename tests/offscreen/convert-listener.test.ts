import { ConvertListener } from "../../src/offscreen/convert-listener";

describe("ConvertListener", () => {
  const answer = { ok: true, url: "blob:x/1" } as const;

  it("answers a conversion request later, keeping the channel open", async () => {
    const handler = { handle: vi.fn().mockResolvedValue(answer) };
    const sendResponse = vi.fn();
    const request = { type: "convert", jobId: "j1", url: "https://x/a.mp4" };

    expect(new ConvertListener(handler).received(request, sendResponse)).toBe(
      true,
    );
    expect(handler.handle).toHaveBeenCalledWith(request);
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith(answer);
    });
  });

  it("leaves any other message alone", () => {
    const handler = { handle: vi.fn() };
    const sendResponse = vi.fn();

    expect(
      new ConvertListener(handler).received({ type: "scheme" }, sendResponse),
    ).toBe(false);
    expect(handler.handle).not.toHaveBeenCalled();
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
