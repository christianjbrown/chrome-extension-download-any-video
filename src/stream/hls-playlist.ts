// Reads HLS playlists (RFC 8216) line by line.
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
const COMMA = ",";
const EQUALS = "=";
const RESOLUTION = /^\d+x(\d+)$/;
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
  const found: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line.slice(line.indexOf(TAG_END) + 1)) {
    if (char === QUOTE) {
      quoted = !quoted;
    }
    if (char === COMMA && !quoted) {
      found.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  found.push(current);
  return found.filter((pair) => pair.includes(EQUALS));
}

// NAME=value pairs, the quotes taken off a quoted value.
function attributes(line: string): Attributes {
  const found = new Map<string, string>();
  for (const pair of pairs(line)) {
    const equals = pair.indexOf(EQUALS);
    const value = pair.slice(equals + 1);
    found.set(
      pair.slice(0, equals),
      value.startsWith(QUOTE) ? value.slice(1, -1) : value,
    );
  }
  return found;
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
    const handler = handlers.find(([tag]) => line.startsWith(tag));
    if (handler !== undefined) {
      handler[1](line);
    } else if (!line.startsWith(COMMENT)) {
      onUri(line);
    }
  }
}

function variant(found: Attributes, url: string): Variant {
  const resolution = RESOLUTION.exec(
    found.get(ATTRIBUTES.resolution) ?? NONE_GIVEN,
  );
  return {
    url,
    height: Number(resolution?.[1] ?? UNKNOWN_SIZE),
    bandwidth: Number(found.get(ATTRIBUTES.bandwidth) ?? UNKNOWN_SIZE),
    audioGroup: found.get(ATTRIBUTES.audio),
  };
}

// An EXT-X-MEDIA line with a URI is a track fetched on its own; without one,
// the sound is inside the variant's own pieces.
function audioRendition(
  found: Attributes,
  baseUrl: string,
): AudioRendition | undefined {
  const uri = found.get(ATTRIBUTES.uri);
  if (found.get(ATTRIBUTES.type) !== AUDIO_TYPE || uri === undefined) {
    return undefined;
  }
  return {
    group: found.get(ATTRIBUTES.groupId) ?? NONE_GIVEN,
    url: resolve(uri, baseUrl),
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
    const spec = found.get(ATTRIBUTES.byteRange);
    this.init = {
      url: resolve(found.get(ATTRIBUTES.uri) ?? NONE_GIVEN, this.baseUrl),
      range: spec === undefined ? undefined : byteRange(spec, FILE_START),
    };
  }

  private segment(uri: string): void {
    const range =
      this.pendingRange === undefined
        ? undefined
        : byteRange(this.pendingRange, this.previousEnd);
    this.segments.push({ url: resolve(uri, this.baseUrl), range });
    this.previousEnd =
      range === undefined ? FILE_START : range.offset + range.length;
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
