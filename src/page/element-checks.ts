// Checks that an element found in the walk is what a finder is about to read
// it as, since a page's elements could be anything.
import {
  equalTo,
  fits,
  isFunction,
  isNumber,
  isRecord,
  isRecordOrNull,
  isString,
  type Shape,
} from "../shared/shape";
import type { ScannedElement, VideoElement } from "./dom";

const VIDEO_TAG = "video";

// What a <video> has beyond what the walk already read of it.
const VIDEO_SHAPE: Shape = {
  localName: equalTo(VIDEO_TAG),
  currentSrc: isString,
  src: isString,
  videoHeight: isNumber,
  querySelectorAll: isFunction,
  getBoundingClientRect: isFunction,
  getRootNode: isFunction,
  attributes: isRecord,
  parentElement: isRecordOrNull,
};

export function isVideoElement(
  element: ScannedElement,
): element is VideoElement {
  return isRecord(element) && fits(element, VIDEO_SHAPE);
}
