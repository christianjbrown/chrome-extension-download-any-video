import type { FrameReport } from "../shared/candidates";
import { isFrameReport } from "../shared/candidate-checks";
import type { FrameAsker } from "./download-steps";

interface FrameResult {
  frameId: number;
  result?: unknown;
}

interface FrameTarget {
  tabId: number;
  allFrames: true;
}

type Injection =
  | { target: FrameTarget; files: string[] }
  | { target: FrameTarget; func: () => unknown };

export interface ScriptingApi {
  executeScript(injection: Injection): Promise<FrameResult[]>;
}

const TOP_FRAME = 0;

// Runs in the page, so it can only reach what the injected file left there. The
// name is spelt out rather than imported, and the checks are written inside:
// the function is serialised. A test pins the name to FINDER_KEY. Anything
// other than a finder there answers nothing, as no finder at all does.
function installedReport(): unknown {
  interface Finder {
    find(): unknown;
  }
  const isObject = (value: unknown): value is object =>
    typeof value === "object" && value !== null;
  const canFind = (value: object): value is Finder =>
    "find" in value && typeof value.find === "function";
  const isFinder = (value: unknown): value is Finder =>
    isObject(value) && canFind(value);
  const finder: unknown = Reflect.get(globalThis, "__downloadAnyVideo");
  return isFinder(finder) ? finder.find() : undefined;
}

export class PageScript implements FrameAsker {
  constructor(
    private readonly scripting: ScriptingApi,
    private readonly file: string,
  ) {}

  // Every frame Chrome lets the extension into, so a video in an embed counts
  // too. Chrome leaves out the frames it does not. The file goes in fresh each
  // time, so a page that changed since the last click is seen as it is now.
  async ask(tabId: number): Promise<FrameReport[]> {
    await this.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: [this.file],
    });
    const results = await this.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: installedReport,
    });
    return results
      .toSorted(
        (a, b) =>
          Number(b.frameId === TOP_FRAME) - Number(a.frameId === TOP_FRAME),
      )
      .map((frame) => frame.result)
      .filter(isFrameReport);
  }
}
