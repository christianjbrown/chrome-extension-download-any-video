// What the service worker and the offscreen document say to each other. The
// worker asks for one URL to be turned into an H.264 MP4; the document reports
// progress while it works and answers once with a blob URL, or with why not.
import {
  equalTo,
  fits,
  isNumber,
  isRecord,
  isString,
  type Shape,
} from "./shape";

export const CONVERT_REQUEST = "convert";
export const PROGRESS_REPORT = "progress";

// The two steps of a conversion, as the toolbar button describes them.
export const FETCH_STAGE = "fetch";
export const CONVERT_STAGE = "convert";
const STAGES = [FETCH_STAGE, CONVERT_STAGE] as const;
export type Stage = (typeof STAGES)[number];

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

function isStage(value: unknown): value is Stage {
  return STAGES.some((stage) => stage === value);
}

const REQUEST_SHAPE: Shape = {
  type: equalTo(CONVERT_REQUEST),
  jobId: isString,
  url: isString,
};

const PROGRESS_SHAPE: Shape = {
  type: equalTo(PROGRESS_REPORT),
  jobId: isString,
  stage: isStage,
  ratio: isNumber,
};

// A response is a success with its URL, or a failure with where and why.
const RESPONSE_SHAPES: readonly Shape[] = [
  { ok: equalTo(true), url: isString },
  { ok: equalTo(false), stage: isStage, message: isString },
];

export function isConvertRequest(message: unknown): message is ConvertRequest {
  return isRecord(message) && fits(message, REQUEST_SHAPE);
}

export function isProgressReport(message: unknown): message is ProgressReport {
  return isRecord(message) && fits(message, PROGRESS_SHAPE);
}

export function isConvertResponse(value: unknown): value is ConvertResponse {
  return isRecord(value) && fitsAResponse(value);
}

function fitsAResponse(value: Record<string, unknown>): boolean {
  return RESPONSE_SHAPES.some((shape) => fits(value, shape));
}
