// How an HLS playlist (RFC 8216) writes what its tags say.
import type { Attributes } from "./hls";
import { UNKNOWN_SIZE, type ByteRange } from "./tracks";

// The tag that names a variant, which only a master playlist has.
export const STREAM_INF_TAG = "#EXT-X-STREAM-INF:";

// The attribute names the readers look at, as RFC 8216 spells them.
export const ATTRIBUTES = {
  resolution: "RESOLUTION",
  bandwidth: "BANDWIDTH",
  audio: "AUDIO",
  uri: "URI",
  type: "TYPE",
  groupId: "GROUP-ID",
  isDefault: "DEFAULT",
  method: "METHOD",
  byteRange: "BYTERANGE",
} as const;

// A file starts at its first byte.
export const FILE_START = 0;

const TAG_END = ":";
const QUOTE = '"';
const EQUALS = "=";
// One attribute of a list: characters up to a comma outside quotes, where a
// quoted part runs to its closing quote, or to the end when it has none.
const PAIR = /(?:[^,"]|"[^"]*(?:"|$))+/g;
// "length@offset" in a byte range.
const OFFSET_MARK = "@";
// A rendition without a group, or a map without an address, has an empty one.
const NONE_GIVEN = "";

// The attribute list after the tag's colon, split on the commas that sit
// outside quotes, since a quoted value may hold one.
function pairs(line: string): string[] {
  const list = line.slice(line.indexOf(TAG_END) + 1);
  return Array.from(list.matchAll(PAIR), (match) => match[0]).filter((pair) =>
    pair.includes(EQUALS),
  );
}

function unquoted(value: string): string {
  return value.startsWith(QUOTE) ? value.slice(1, -1) : value;
}

function nameAndValue(pair: string): [string, string] {
  const equals = pair.indexOf(EQUALS);
  return [pair.slice(0, equals), unquoted(pair.slice(equals + 1))];
}

// NAME=value pairs, the quotes taken off a quoted value.
export function attributes(line: string): Attributes {
  return new Map(pairs(line).map(nameAndValue));
}

// An attribute's value, or an empty one when the line leaves it out.
export function given(found: Attributes, name: string): string {
  return found.get(name) ?? NONE_GIVEN;
}

export function sizeOf(value: string | undefined): number {
  return Number(value ?? UNKNOWN_SIZE);
}

export function resolve(uri: string, baseUrl: string): string {
  return new URL(uri, baseUrl).href;
}

// "length@offset", or just "length", which continues from the previous piece.
export function byteRange(spec: string, previousEnd: number): ByteRange {
  const [length, offset] = spec.split(OFFSET_MARK);
  return {
    length: Number(length),
    offset: offset === undefined ? previousEnd : Number(offset),
  };
}
