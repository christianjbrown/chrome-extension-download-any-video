// Checks that an element found in the walk is what a finder is about to read
// it as, since a page's elements could be anything.
import {
  absentOr,
  equalTo,
  everyIterated,
  fits,
  isFunction,
  isNumber,
  isRecord,
  isString,
  type FieldTest,
  type Shape,
} from "../shared/shape";
import type { ScannedElement, VideoElement } from "./dom";

const VIDEO_TAG = "video";

// The method that says which shadow root, if any, an element sits in.
const ROOT_NODE = "getRootNode";

// One of an element's attributes.
const ATTRIBUTE_SHAPE: Shape = { name: isString, value: isString };

const isAttribute: FieldTest = (value) =>
  isRecord(value) && fits(value, ATTRIBUTE_SHAPE);

// What the player search reads, all the way up through parents and the hosts
// of shadow roots.
const PLAYER_SHAPE: Shape = {
  attributes: everyIterated(isAttribute),
  parentElement: absentOr(isPlayerElement),
};

// The root an element sits in: the document, with no host, or a shadow root
// whose host is a player element too.
const ROOT_SHAPE: Shape = { host: absentOr(isPlayerElement) };

// What a <video> has beyond what the walk already read of it and what the
// player search reads.
const VIDEO_SHAPE: Shape = {
  localName: equalTo(VIDEO_TAG),
  currentSrc: isString,
  src: isString,
  videoHeight: isNumber,
  querySelectorAll: isFunction,
  getBoundingClientRect: isFunction,
};

export function isVideoElement(
  element: ScannedElement,
): element is VideoElement {
  return isRecord(element) && fitsVideo(element);
}

function fitsVideo(element: Record<string, unknown>): boolean {
  return fits(element, VIDEO_SHAPE) && isPlayerElement(element);
}

function isPlayerElement(value: unknown): boolean {
  return isRecord(value) && fitsPlayer(value);
}

function fitsPlayer(element: Record<string, unknown>): boolean {
  return fits(element, PLAYER_SHAPE) && hasPlayerRoot(element);
}

function hasPlayerRoot(element: Record<string, unknown>): boolean {
  const root = rootOf(element);
  return isRecord(root) && fits(root, ROOT_SHAPE);
}

// The element's root, or nothing when it has no way to say.
function rootOf(element: Record<string, unknown>): unknown {
  const method = element[ROOT_NODE];
  return typeof method === "function"
    ? Reflect.apply(method, element, [])
    : undefined;
}
