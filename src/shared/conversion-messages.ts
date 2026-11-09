// What the service worker and the offscreen document say to each other. The
// worker asks for one URL to be turned into an H.264 MP4; the document reports
// progress while it works and answers once with a blob URL, or with why not.

export const CONVERT_REQUEST = "convert";
export const PROGRESS_REPORT = "progress";

// The two steps of a conversion, as the toolbar button describes them.
export type Stage = "fetch" | "convert";
export const FETCH_STAGE: Stage = "fetch";
export const CONVERT_STAGE: Stage = "convert";

export interface ConvertRequest {
  readonly type: typeof CONVERT_REQUEST;
  readonly jobId: string;
  readonly url: string;
}

export interface ProgressReport {
  readonly type: typeof PROGRESS_REPORT;
  readonly jobId: string;
  readonly stage: Stage;
  readonly ratio: number;
}

export type ConvertResponse =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly stage: Stage; readonly message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStage(value: unknown): value is Stage {
  return value === FETCH_STAGE || value === CONVERT_STAGE;
}

export function isConvertRequest(message: unknown): message is ConvertRequest {
  return (
    isRecord(message) &&
    message.type === CONVERT_REQUEST &&
    typeof message.jobId === "string" &&
    typeof message.url === "string"
  );
}

export function isProgressReport(message: unknown): message is ProgressReport {
  return (
    isRecord(message) &&
    message.type === PROGRESS_REPORT &&
    typeof message.jobId === "string" &&
    isStage(message.stage) &&
    typeof message.ratio === "number"
  );
}

export function isConvertResponse(value: unknown): value is ConvertResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.ok === true) {
    return typeof value.url === "string";
  }
  return (
    value.ok === false &&
    isStage(value.stage) &&
    typeof value.message === "string"
  );
}
