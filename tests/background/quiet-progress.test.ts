import { QuietProgress } from "../../src/background/quiet-progress";
import { ToolbarIndicator } from "../../src/background/toolbar-indicator";
import { fakeIndicator, looks } from "./fakes";

function action() {
  return {
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
  };
}

describe("QuietProgress", () => {
  it("only redraws progress when the number on the button would change", async () => {
    const toolbar = action();
    const indicator = new QuietProgress(
      new ToolbarIndicator(toolbar, looks),
      looks,
    );

    await indicator.showProgress(3, "convert", 0.421);
    await indicator.showProgress(3, "convert", 0.424);
    await indicator.showProgress(3, "convert", 0.43);
    await indicator.showProgress(4, "convert", 0.43);
    await indicator.showDone(3, { filename: "clip.mp4", converted: true });
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

  it("passes everything that is not progress straight on", async () => {
    const inner = fakeIndicator();
    const indicator = new QuietProgress(inner, looks);

    await indicator.showIdle(3);
    await indicator.showBusy(3);
    await indicator.showError(3, "no luck");

    expect(inner.showIdle).toHaveBeenCalledWith(3);
    expect(inner.showBusy).toHaveBeenCalledWith(3);
    expect(inner.showError).toHaveBeenCalledWith(3, "no luck");
  });

  it("redraws the same progress after the button showed something else", async () => {
    const inner = fakeIndicator();
    const indicator = new QuietProgress(inner, looks);

    await indicator.showProgress(3, "fetch", 0.5);
    await indicator.showIdle(3);
    await indicator.showProgress(3, "fetch", 0.5);
    await indicator.showBusy(3);
    await indicator.showProgress(3, "fetch", 0.5);
    await indicator.showError(3, "no luck");
    await indicator.showProgress(3, "fetch", 0.5);

    expect(inner.showProgress).toHaveBeenCalledTimes(4);
  });
});
