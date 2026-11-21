import { ChromeErrorExplainer } from "../../src/background/chrome-errors";
import { CHROME_TRANSLATIONS } from "../../src/wiring/chrome-translations";

describe("ChromeErrorExplainer", () => {
  const explainer = new ChromeErrorExplainer(CHROME_TRANSLATIONS);

  it.each([
    [
      "Cannot access a chrome:// URL",
      "Chrome does not let extensions into its own pages",
    ],
    [
      'Cannot access contents of url "chrome://extensions/". Extension manifest must request permission to access this host.',
      "Chrome does not let extensions into its own pages",
    ],
    [
      "The extensions gallery cannot be scripted.",
      "Chrome does not let extensions into the Web Store",
    ],
    [
      'Cannot access contents of url "file:///Users/me/clip.html". Extension manifest must request permission to access this host.',
      "Turn on Allow access to file URLs for this extension to use it on local files",
    ],
    [
      "The 'activeTab' permission is required to script this tab",
      "Click the button on the tab that shows the video",
    ],
    ["No video found on this page", "No video found on this page"],
  ])("explains %s", (chromeSays, meaning) => {
    expect(explainer.explain(new Error(chromeSays))).toBe(meaning);
  });

  it("passes on something that is not an Error as it is", () => {
    expect(explainer.explain("odd")).toBe("odd");
  });

  it("speaks only the translations it was given", () => {
    const own = new ChromeErrorExplainer([
      { pattern: /^Nope/, message: "Chrome said no" },
    ]);

    expect(own.explain(new Error("Nope, not today"))).toBe("Chrome said no");
    expect(own.explain(new Error("Cannot access a chrome:// URL"))).toBe(
      "Cannot access a chrome:// URL",
    );
  });
});
