// Checks that a frame's answer is the report the page script makes, since it
// comes back from the page as anything at all.
import {
  CANDIDATE_ORIGINS,
  type FrameReport,
  type VideoCandidate,
} from "./candidates";
import {
  everyItem,
  fits,
  isNumber,
  isRecord,
  isString,
  oneOf,
  type Shape,
} from "./shape";

const CANDIDATE_SHAPE: Shape = {
  url: isString,
  origin: oneOf(CANDIDATE_ORIGINS),
  height: isNumber,
};

export function isCandidate(value: unknown): value is VideoCandidate {
  return isRecord(value) && fits(value, CANDIDATE_SHAPE);
}

const REPORT_SHAPE: Shape = {
  title: isString,
  candidates: everyItem(isCandidate),
};

export function isFrameReport(value: unknown): value is FrameReport {
  return isRecord(value) && fits(value, REPORT_SHAPE);
}
