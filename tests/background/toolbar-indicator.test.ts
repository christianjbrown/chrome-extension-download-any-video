import { ToolbarIndicator } from "../../src/background/toolbar-indicator";
import { looks } from "./fakes";

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
      show: (indicator: ToolbarIndicator) =>
        indicator.showDone(3, { filename: "clip.mp4", converted: true }),
      text: "✓",
      color: "#1a73e8",
      title: "Downloaded clip.mp4",
    },
    {
      show: (indicator: ToolbarIndicator) =>
        indicator.showDone(3, { filename: "clip.webm", converted: false }),
      text: "✓",
      color: "#1a73e8",
      title:
        "Downloaded clip.webm, as the site served it: it could not be converted",
    },
    {
      show: (indicator: ToolbarIndicator) => indicator.showError(3, "no luck"),
      text: "!",
      color: "#dc2626",
      title: "Download failed: no luck",
    },
  ])("shows $title on that tab only", async ({ show, text, color, title }) => {
    const toolbar = action();

    await show(new ToolbarIndicator(toolbar, looks));

    expect(toolbar.setBadgeText).toHaveBeenCalledWith({ tabId: 3, text });
    expect(toolbar.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: 3,
      color,
    });
    expect(toolbar.setTitle).toHaveBeenCalledWith({ tabId: 3, title });
  });
});
