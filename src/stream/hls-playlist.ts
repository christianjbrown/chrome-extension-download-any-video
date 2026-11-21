// Reads HLS playlists (RFC 8216) line by line.
import { ifDefined } from "../shared/optional";
import type {
  AudioRendition,
  HlsParsing,
  MasterPlaylist,
  MediaPlaylist,
  Variant,
} from "./hls";
import { UNKNOWN_SIZE, type ByteRange, type Piece } from "./tracks";

const STREAM_INF_TAG = "#EXT-X-STREAM-INF:";
const MEDIA_TAG = "#EXT-X-MEDIA:";
const MAP_TAG = "#EXT-X-MAP:";
const KEY_TAG = "#EXT-X-KEY:";
const BYTERANGE_TAG = "#EXT-X-BYTERANGE:";
const COMMENT = "#";
const AUDIO_TYPE = "AUDIO";
const YES = "YES";
const NO_ENCRYPTION = "NONE";

// The attribute names the reader looks at, as RFC 8216 spells them.
const ATTRIBUTES = {
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

type Attributes = ReadonlyMap<string, string>;

const TAG_END = ":";
const QUOTE = '"';
const EQUALS = "=";
// One attribute of a list: characters up to a comma outside quotes, where a
// quoted part runs to its closing quote, or to the end when it has none.
const PAIR = /(?:[^,"]|"[^"]*(?:"|$))+/g;
const RESOLUTION = /^\d+x(\d+)$/;
// Where the height sits in a resolution.
const HEIGHT_GROUP = 1;
const LINE_BREAK = /\r?\n/;
// "length@offset" in a byte range.
const OFFSET_MARK = "@";
// A rendition without a group, or a map without an address, has an empty one.
const NONE_GIVEN = "";
// A file starts at its first byte.
const FILE_START = 0;

function lines(text: string): string[] {
  return text
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

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
function attributes(line: string): Attributes {
  return new Map(pairs(line).map(nameAndValue));
}

// An attribute's value, or an empty one when the line leaves it out.
function given(found: Attributes, name: string): string {
  return found.get(name) ?? NONE_GIVEN;
}

function sizeOf(value: string | undefined): number {
  return Number(value ?? UNKNOWN_SIZE);
}

function resolve(uri: string, baseUrl: string): string {
  return new URL(uri, baseUrl).href;
}

// What to do with a line that starts with each tag the reader cares about.
type TagHandlers = readonly (readonly [string, (line: string) => void])[];

// Hands each line to the handler for its tag. A line that is neither a tag
// nor a comment is a URI. Reading another tag is another handler.
function readLines(
  text: string,
  handlers: TagHandlers,
  onUri: (uri: string) => void,
): void {
  for (const line of lines(text)) {
    readLine(line, handlers, onUri);
  }
}

function readLine(
  line: string,
  handlers: TagHandlers,
  onUri: (uri: string) => void,
): void {
  const handler = handlers.find(([tag]) => line.startsWith(tag));
  if (handler !== undefined) {
    handler[1](line);
    return;
  }
  uriUnlessComment(line, onUri);
}

function uriUnlessComment(line: string, onUri: (uri: string) => void): void {
  if (!line.startsWith(COMMENT)) {
    onUri(line);
  }
}

function resolutionHeight(found: Attributes): string | undefined {
  return RESOLUTION.exec(given(found, ATTRIBUTES.resolution))?.[HEIGHT_GROUP];
}

function variant(found: Attributes, url: string): Variant {
  return {
    url,
    height: sizeOf(resolutionHeight(found)),
    bandwidth: sizeOf(found.get(ATTRIBUTES.bandwidth)),
    audioGroup: found.get(ATTRIBUTES.audio),
  };
}

// An EXT-X-MEDIA line with a URI is a track fetched on its own; without one,
// the sound is inside the variant's own pieces.
function audioRendition(
  found: Attributes,
  baseUrl: string,
): AudioRendition | undefined {
  return found.get(ATTRIBUTES.type) === AUDIO_TYPE
    ? ifDefined(found.get(ATTRIBUTES.uri), (uri) =>
        rendition(found, resolve(uri, baseUrl)),
      )
    : undefined;
}

function rendition(found: Attributes, url: string): AudioRendition {
  return {
    group: given(found, ATTRIBUTES.groupId),
    url,
    isDefault: found.get(ATTRIBUTES.isDefault) === YES,
  };
}

class MasterPlaylistReader {
  private readonly variants: Variant[] = [];
  private readonly audio: AudioRendition[] = [];
  // A variant's attributes, waiting for the URI on the line after them.
  private pending: Attributes | undefined;
  private readonly handlers: TagHandlers = [
    [
      STREAM_INF_TAG,
      (line) => {
        this.pending = attributes(line);
      },
    ],
    [
      MEDIA_TAG,
      (line) => {
        this.media(attributes(line));
      },
    ],
  ];

  constructor(private readonly baseUrl: string) {}

  read(text: string): MasterPlaylist {
    readLines(text, this.handlers, (uri) => {
      this.uri(uri);
    });
    return { variants: this.variants, audio: this.audio };
  }

  private media(found: Attributes): void {
    const rendition = audioRendition(found, this.baseUrl);
    if (rendition !== undefined) {
      this.audio.push(rendition);
    }
  }

  private uri(uri: string): void {
    if (this.pending !== undefined) {
      this.variants.push(variant(this.pending, resolve(uri, this.baseUrl)));
      this.pending = undefined;
    }
  }
}

// "length@offset", or just "length", which continues from the previous piece.
function byteRange(spec: string, previousEnd: number): ByteRange {
  const [length, offset] = spec.split(OFFSET_MARK);
  return {
    length: Number(length),
    offset: offset === undefined ? previousEnd : Number(offset),
  };
}

// Where a piece ends, which is where the next one starts when its range only
// gives a length. A piece without a range is a whole file.
function endOf(range: ByteRange | undefined): number {
  return range === undefined ? FILE_START : range.offset + range.length;
}

class MediaPlaylistReader {
  private init: Piece | undefined;
  private readonly segments: Piece[] = [];
  private encrypted = false;
  private pendingRange: string | undefined;
  private previousEnd = FILE_START;
  private readonly handlers: TagHandlers = [
    [
      KEY_TAG,
      (line) => {
        this.key(attributes(line));
      },
    ],
    [
      MAP_TAG,
      (line) => {
        this.map(attributes(line));
      },
    ],
    [
      BYTERANGE_TAG,
      (line) => {
        this.pendingRange = line.slice(BYTERANGE_TAG.length);
      },
    ],
  ];

  constructor(private readonly baseUrl: string) {}

  read(text: string): MediaPlaylist {
    readLines(text, this.handlers, (uri) => {
      this.segment(uri);
    });
    return {
      init: this.init,
      segments: this.segments,
      encrypted: this.encrypted,
    };
  }

  private key(found: Attributes): void {
    if (found.get(ATTRIBUTES.method) !== NO_ENCRYPTION) {
      this.encrypted = true;
    }
  }

  private map(found: Attributes): void {
    this.init = {
      url: resolve(given(found, ATTRIBUTES.uri), this.baseUrl),
      range: ifDefined(found.get(ATTRIBUTES.byteRange), (spec) =>
        byteRange(spec, FILE_START),
      ),
    };
  }

  private segment(uri: string): void {
    const range = ifDefined(this.pendingRange, (spec) =>
      byteRange(spec, this.previousEnd),
    );
    this.segments.push({ url: resolve(uri, this.baseUrl), range });
    this.previousEnd = endOf(range);
    this.pendingRange = undefined;
  }
}

// Each read is a fresh reader, since reading keeps track of the lines so far.
export class HlsPlaylistParser implements HlsParsing {
  isMaster(text: string): boolean {
    return lines(text).some((line) => line.startsWith(STREAM_INF_TAG));
  }

  master(text: string, baseUrl: string): MasterPlaylist {
    return new MasterPlaylistReader(baseUrl).read(text);
  }

  media(text: string, baseUrl: string): MediaPlaylist {
    return new MediaPlaylistReader(baseUrl).read(text);
  }
}
