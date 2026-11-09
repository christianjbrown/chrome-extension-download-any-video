import { ToolbarIndicator } from "../../src/background/toolbar-indicator";

function action() {
  return {
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ToolbarIndicator", () => {
  it.each([
    {
      show: (indicator: ToolbarIndicator) => indicator.showIdle(3),
      text: "",
      color: "#5a5a60",
      title: "Download the video on this page",
    },
    {
      show: (indicator: ToolbarIndicator) => indicator.showBusy(3),
      text: "…",
      color: "#1a73e8",
      title: "Looking for the video and downloading it",
    },
    {
      show: (indicator: ToolbarIndicator) =>
        indicator.showProgress(3, "fetch", 0.374),
      text: "37%",
      color: "#1a73e8",
      title: "Fetching the video (37%)",
    },
    {
      show: (indicator: ToolbarIndicator) =>
        indicator.showProgress(3, "convert", 1),
      text: "100%",
      color: "#1a73e8",
      title: "Converting the video to H.264 (100%)",
    },
    {
      show: (indicator: ToolbarIndicator) => indicator.showDone(3, "clip.mp4"),
      text: "✓",
      color: "#1a73e8",
      title: "Downloaded clip.mp4",
    },
    {
      show: (indicator: ToolbarIndicator) => indicator.showError(3, "no luck"),
      text: "!",
      color: "#dc2626",
      title: "Download failed: no luck",
    },
  ])("shows $title on that tab only", async ({ show, text, color, title }) => {
    const toolbar = action();

    await show(new ToolbarIndicator(toolbar));

    expect(toolbar.setBadgeText).toHaveBeenCalledWith({ tabId: 3, text });
    expect(toolbar.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: 3,
      color,
    });
    expect(toolbar.setTitle).toHaveBeenCalledWith({ tabId: 3, title });
  });

  it("only redraws progress when the number on the button would change", async () => {
    const toolbar = action();
    const indicator = new ToolbarIndicator(toolbar);

    await indicator.showProgress(3, "convert", 0.421);
    await indicator.showProgress(3, "convert", 0.424);
    await indicator.showProgress(3, "convert", 0.43);
    await indicator.showProgress(4, "convert", 0.43);
    await indicator.showDone(3, "clip.mp4");
    await indicator.showProgress(3, "convert", 0.43);

    expect(
      toolbar.setBadgeText.mock.calls.map(([call]: unknown[]) => call),
    ).toEqual([
      { tabId: 3, text: "42%" },
      { tabId: 3, text: "43%" },
      { tabId: 4, text: "43%" },
      { tabId: 3, text: "✓" },
      { tabId: 3, text: "43%" },
    ]);
  });
});
