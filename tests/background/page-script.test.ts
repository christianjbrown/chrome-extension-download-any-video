import { PageScript } from "../../src/background/page-script";
import { FINDER_KEY } from "../../src/shared/installed-finder";

function setup(results: unknown[]) {
  const scripting = {
    executeScript: vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(results),
  };
  return { scripting, script: new PageScript(scripting, "page.js") };
}

const report = (title: string) => ({
  title,
  candidates: [
    { url: "https://cdn.example/a.mp4", origin: "element", height: 0 },
  ],
});

describe("PageScript", () => {
  it("injects the file into every frame, then asks each for its report, top frame first", async () => {
    const { scripting, script } = setup([
      { frameId: 12, result: report("embed") },
      { frameId: 0, result: report("top") },
      { frameId: 13, result: undefined },
      { frameId: 14, result: { title: 5 } },
      { frameId: 15 },
      { frameId: 16, result: { title: "bad", candidates: [{ url: 1 }] } },
    ]);

    await expect(script.ask(7)).resolves.toEqual([
      report("top"),
      report("embed"),
    ]);

    expect(scripting.executeScript).toHaveBeenNthCalledWith(1, {
      target: { tabId: 7, allFrames: true },
      files: ["page.js"],
    });
    const second = scripting.executeScript.mock.calls[1]![0] as {
      func: () => unknown;
    };
    expect(second).toMatchObject({ target: { tabId: 7, allFrames: true } });
    expect(typeof second.func).toBe("function");
  });

  it("asks the page through the global the file left behind", async () => {
    const { scripting, script } = setup([]);
    await script.ask(7);
    const { func } = scripting.executeScript.mock.calls[1]![0] as {
      func: () => unknown;
    };
    expect(func()).toBeUndefined();
    vi.stubGlobal(FINDER_KEY, { find: () => report("here") });

    expect(func()).toEqual(report("here"));
    vi.stubGlobal(FINDER_KEY, { find: "not a function" });
    expect(func()).toBeUndefined();
    vi.stubGlobal(FINDER_KEY, "not a finder");
    expect(func()).toBeUndefined();
  });
});
