import type { FrameReport } from "../shared/candidates";

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

// The script that looks for the video in each frame of a tab.
export interface FrameAsker {
  // What every frame Chrome lets the extension into says, top frame first.
  ask(tabId: number): Promise<FrameReport[]>;
}

const TOP_FRAME = 0;

// Runs in the page, so it can only reach what the injected file left there. The
// name is spelt out rather than imported: the function is serialised.
function installedReport(): unknown {
  return (
    globalThis as unknown as Record<string, { find(): unknown } | undefined>
  ).__downloadAnyVideo?.find();
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
      .filter(isReport);
  }
}

function isReport(value: unknown): value is FrameReport {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { title?: unknown }).title === "string" &&
    Array.isArray((value as { candidates?: unknown }).candidates)
  );
}
