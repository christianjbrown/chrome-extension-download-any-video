import { OffscreenDocument } from "../../src/background/offscreen-document";

function setup(existing: unknown[] = []) {
  const offscreen = {
    createDocument: vi.fn().mockResolvedValue(undefined),
    closeDocument: vi.fn().mockResolvedValue(undefined),
  };
  const runtime = { getContexts: vi.fn().mockResolvedValue(existing) };
  return {
    offscreen,
    runtime,
    document: new OffscreenDocument(offscreen, runtime),
  };
}

describe("OffscreenDocument", () => {
  it("creates the document for the first user and closes it after the last", async () => {
    const { offscreen, runtime, document } = setup();

    await document.open();
    await document.open();
    await document.release();
    expect(offscreen.closeDocument).not.toHaveBeenCalled();
    await document.release();

    expect(runtime.getContexts).toHaveBeenCalledWith({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });
    expect(offscreen.createDocument).toHaveBeenCalledTimes(1);
    expect(offscreen.createDocument).toHaveBeenCalledWith({
      url: "offscreen.html",
      reasons: ["WORKERS"],
      justification: expect.stringContaining("H.264") as string,
    });
    expect(offscreen.closeDocument).toHaveBeenCalledTimes(1);
  });

  it("reuses a document left over from before the service worker restarted", async () => {
    const { offscreen, document } = setup([
      { contextType: "OFFSCREEN_DOCUMENT" },
    ]);

    await document.open();

    expect(offscreen.createDocument).not.toHaveBeenCalled();
  });

  it("opens again after closing", async () => {
    const { offscreen, document } = setup();

    await document.open();
    await document.release();
    await document.open();

    expect(offscreen.createDocument).toHaveBeenCalledTimes(2);
  });

  it("passes on a refusal and forgets the attempt", async () => {
    const { offscreen, document } = setup();
    offscreen.createDocument.mockRejectedValueOnce(
      new Error("no offscreen for you"),
    );

    await expect(document.open()).rejects.toThrow("no offscreen for you");
    await document.open();
    await document.release();

    expect(offscreen.createDocument).toHaveBeenCalledTimes(2);
    expect(offscreen.closeDocument).toHaveBeenCalledTimes(1);
  });
});
