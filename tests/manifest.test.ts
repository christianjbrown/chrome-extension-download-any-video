import manifest from "../static/manifest.json";

describe("manifest", () => {
  it("is named so it stands out in chrome://extensions", () => {
    expect(manifest.name).toBe("Christian's Download Any Video");
    expect(manifest.action.default_title).toBe(
      "Download the video on this page",
    );
  });

  // activeTab and scripting put the finder into the clicked tab, and only that
  // tab, on a click. downloads saves the video. offscreen is the hidden page
  // that converts it, and the host permission is what lets that page fetch
  // the video from wherever the site keeps it.
  it("asks for the tab it is clicked on, downloads, the offscreen page and fetching the video", () => {
    expect(manifest.permissions).toEqual([
      "activeTab",
      "scripting",
      "downloads",
      "offscreen",
    ]);
    expect(manifest.host_permissions).toEqual(["<all_urls>"]);
    expect(manifest).not.toHaveProperty("optional_permissions");
  });

  // ffmpeg is WebAssembly, and its multi-threaded build needs
  // SharedArrayBuffer, which only a cross-origin isolated page gets.
  it("lets its own pages run WebAssembly with shared memory", () => {
    expect(manifest.content_security_policy.extension_pages).toBe(
      "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    );
    expect(manifest.cross_origin_embedder_policy).toEqual({
      value: "require-corp",
    });
    expect(manifest.cross_origin_opener_policy).toEqual({
      value: "same-origin",
    });
  });

  it("has no keyboard shortcut and no options page", () => {
    expect(manifest).not.toHaveProperty("commands");
    expect(manifest).not.toHaveProperty("options_page");
    expect(manifest).not.toHaveProperty("options_ui");
  });
});
