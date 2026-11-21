import { OffscreenDocument } from "../../src/background/offscreen-document";
import { SerialQueue } from "../../src/shared/serial-queue";

const page = {
  url: "converter.html",
  reasons: ["WORKERS", "MATCH_MEDIA"],
  justification: "Converts videos and watches the colour scheme",
};

// A fake Chrome that keeps track of whether its one offscreen document is
// there, and refuses a second one the way the real one does.
function setup(alreadyOpen = false) {
  let open = alreadyOpen;
  const offscreen = {
    createDocument: vi.fn(() => {
      if (open) {
        return Promise.reject(new Error("Only a single offscreen document"));
      }
      open = true;
      return Promise.resolve();
    }),
    closeDocument: vi.fn(() => {
      open = false;
      return Promise.resolve();
    }),
  };
  const runtime = {
    getContexts: vi.fn(() =>
      Promise.resolve(open ? [{ contextType: "OFFSCREEN_DOCUMENT" }] : []),
    ),
  };
  return {
    offscreen,
    runtime,
    isOpen: () => open,
    document: new OffscreenDocument(
      offscreen,
      runtime,
      page,
      new SerialQueue(),
    ),
  };
}

describe("OffscreenDocument", () => {
  it("creates the document with every reason it is used for", async () => {
    const { offscreen, runtime, document } = setup();

    await document.open();

    expect(runtime.getContexts).toHaveBeenCalledWith({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });
    expect(offscreen.createDocument).toHaveBeenCalledExactlyOnceWith(page);
  });

  it("leaves a document that is already open alone", async () => {
    const { offscreen, document } = setup();

    await document.open();
    await document.open();

    expect(offscreen.createDocument).toHaveBeenCalledTimes(1);
    expect(offscreen.closeDocument).not.toHaveBeenCalled();
  });

  it("reuses a document left over from before the service worker restarted", async () => {
    const { offscreen, document } = setup(true);

    await document.open();

    expect(offscreen.createDocument).not.toHaveBeenCalled();
  });

  it("creates only one document when several events ask at once", async () => {
    const { offscreen, document } = setup();

    await Promise.all([document.open(), document.open(), document.open()]);

    expect(offscreen.createDocument).toHaveBeenCalledTimes(1);
  });

  it("swaps an open document for a fresh one", async () => {
    const { offscreen, document, isOpen } = setup();
    await document.open();

    await document.renew();

    expect(offscreen.closeDocument).toHaveBeenCalledTimes(1);
    expect(offscreen.createDocument).toHaveBeenCalledTimes(2);
    expect(isOpen()).toBe(true);
  });

  it("creates the document when asked for a fresh one and there is none", async () => {
    const { offscreen, document, isOpen } = setup();

    await document.renew();

    expect(offscreen.closeDocument).not.toHaveBeenCalled();
    expect(offscreen.createDocument).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(true);
  });

  it("ends with one open document when opening and swapping overlap", async () => {
    const { offscreen, document, isOpen } = setup();

    await Promise.all([
      document.open(),
      document.renew(),
      document.open(),
      document.renew(),
      document.open(),
    ]);

    expect(offscreen.createDocument).toHaveBeenCalledTimes(3);
    expect(offscreen.closeDocument).toHaveBeenCalledTimes(2);
    expect(isOpen()).toBe(true);
  });

  it("opens again after the document was closed behind its back", async () => {
    const { offscreen, document } = setup();
    await document.open();
    await offscreen.closeDocument();

    await document.open();

    expect(offscreen.createDocument).toHaveBeenCalledTimes(2);
  });

  it("passes on a refusal and tries again the next time", async () => {
    const { offscreen, document, isOpen } = setup();
    offscreen.createDocument.mockRejectedValueOnce(
      new Error("no offscreen for you"),
    );

    await expect(document.open()).rejects.toThrow("no offscreen for you");
    await document.open();

    expect(offscreen.createDocument).toHaveBeenCalledTimes(2);
    expect(isOpen()).toBe(true);
  });
});
