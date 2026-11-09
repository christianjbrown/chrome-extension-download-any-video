import manifest from "../static/manifest.json";

describe("manifest", () => {
  it("is named so it stands out in chrome://extensions", () => {
    expect(manifest.name).toBe("Christian's Download Any Video");
    expect(manifest.action.default_title).toBe(
      "Download the video on this page",
    );
  });

  // activeTab and scripting put the finder into the clicked tab, and only that
  // tab, on a click. downloads saves the video. Nothing reads any other page,
  // so no host permissions.
  it("asks for activeTab, scripting and downloads, and nothing else", () => {
    expect(manifest.permissions).toEqual([
      "activeTab",
      "scripting",
      "downloads",
    ]);
    expect(manifest).not.toHaveProperty("host_permissions");
    expect(manifest).not.toHaveProperty("optional_permissions");
  });

  it("has no keyboard shortcut and no options page", () => {
    expect(manifest).not.toHaveProperty("commands");
    expect(manifest).not.toHaveProperty("options_page");
    expect(manifest).not.toHaveProperty("options_ui");
  });
});
