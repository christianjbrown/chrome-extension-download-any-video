// Drives the service worker's wiring through a fake chrome, end to end.
type Listener = (...args: unknown[]) => unknown;

function chromeEvent() {
  const listeners: Listener[] = [];
  return {
    listeners,
    addListener: (listener: Listener) => listeners.push(listener),
    removeListener: (listener: Listener) => {
      listeners.splice(listeners.indexOf(listener), 1);
    },
    fire: (...args: unknown[]) =>
      listeners.map((listener) => listener(...args)),
  };
}

const report = {
  title: "Wallpaper of the day",
  candidates: [
    {
      url: "https://cdn.example/pb/m2-res_720p.mp4",
      origin: "player",
      height: 720,
    },
  ],
};

function fakeChrome() {
  return {
    action: {
      onClicked: chromeEvent(),
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setTitle: vi.fn().mockResolvedValue(undefined),
    },
    scripting: {
      executeScript: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ frameId: 0, result: report }]),
    },
    tabs: { onUpdated: chromeEvent() },
    downloads: {
      download: vi.fn().mockResolvedValue(31),
      onChanged: chromeEvent(),
    },
    offscreen: {
      createDocument: vi.fn().mockResolvedValue(undefined),
      closeDocument: vi.fn().mockResolvedValue(undefined),
    },
    runtime: {
      getContexts: vi.fn().mockResolvedValue([]),
      sendMessage: vi
        .fn()
        .mockResolvedValue({ ok: true, url: "blob:chrome-extension://x/1" }),
      onMessage: chromeEvent(),
    },
  };
}

async function load() {
  vi.resetModules();
  const chrome = fakeChrome();
  vi.stubGlobal("chrome", chrome);
  await import("../../src/background/main");
  return chrome;
}

describe("service worker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 16, 5));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("converts and downloads the page's video on a click, named after the page", async () => {
    const chrome = await load();
    chrome.runtime.sendMessage.mockImplementation(
      (request: { jobId: string }) => {
        chrome.runtime.onMessage.fire({
          type: "progress",
          jobId: request.jobId,
          stage: "convert",
          ratio: 0.5,
        });
        return Promise.resolve({
          ok: true,
          url: "blob:chrome-extension://x/1",
        });
      },
    );

    chrome.action.onClicked.fire({ id: 6 });

    await vi.waitFor(() => {
      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: "blob:chrome-extension://x/1",
        filename: "2026-11-09-16-05-wallpaper-of-the-day.mp4",
        saveAs: false,
        conflictAction: "uniquify",
      });
    });
    expect(chrome.offscreen.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ url: "offscreen.html" }),
    );
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "convert",
      jobId: expect.any(String) as string,
      url: "https://cdn.example/pb/m2-res_720p.mp4",
    });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 6,
      text: "…",
    });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 6,
      text: "50%",
    });
    expect(chrome.offscreen.closeDocument).not.toHaveBeenCalled();
    chrome.downloads.onChanged.fire({ id: 31, state: { current: "complete" } });
    await vi.waitFor(() => {
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 6,
        text: "✓",
      });
    });
    expect(chrome.offscreen.closeDocument).toHaveBeenCalledTimes(1);
  });

  it("downloads the video as it is when the converter could not fetch it", async () => {
    const chrome = await load();
    chrome.runtime.sendMessage.mockResolvedValue({
      ok: false,
      stage: "fetch",
      message: "The server answered 403 for the video",
    });

    chrome.action.onClicked.fire({ id: 6 });

    await vi.waitFor(() => {
      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://cdn.example/pb/m2-res_720p.mp4",
          filename: "2026-11-09-16-05-wallpaper-of-the-day.mp4",
        }),
      );
    });
    expect(chrome.offscreen.closeDocument).toHaveBeenCalledTimes(1);
  });

  it("says why when the page refuses the script", async () => {
    const chrome = await load();
    chrome.scripting.executeScript
      .mockReset()
      .mockRejectedValue(new Error("Cannot access a chrome:// URL"));

    chrome.action.onClicked.fire({ id: 6 });

    await vi.waitFor(() => {
      expect(chrome.action.setTitle).toHaveBeenCalledWith({
        tabId: 6,
        title:
          "Download failed: Chrome does not let extensions into its own pages",
      });
    });
  });

  it("clears the button when the tab loads a new page", async () => {
    const chrome = await load();

    chrome.tabs.onUpdated.fire(6, { status: "loading" });

    await vi.waitFor(() => {
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 6,
        text: "",
      });
    });
  });
});
