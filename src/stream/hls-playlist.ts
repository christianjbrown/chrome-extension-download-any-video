// Reads HLS playlists (RFC 8216) line by line. What each tag means is up to
// the tags the entry points hand the parser.
import { ifDefined } from "../shared/optional";
import type {
  Attributes,
  HlsParsing,
  HlsTag,
  HlsTags,
  MasterPlaylist,
  MasterReading,
  MediaPlaylist,
  MediaReading,
  Variant,
} from "./hls";
import {
  ATTRIBUTES,
  byteRange,
  FILE_START,
  given,
  resolve,
  sizeOf,
  STREAM_INF_TAG,
} from "./hls-syntax";
import type { ByteRange } from "./tracks";

const COMMENT = "#";
const RESOLUTION = /^\d+x(\d+)$/;
// Where the height sits in a resolution.
const HEIGHT_GROUP = 1;
const LINE_BREAK = /\r?\n/;

function lines(text: string): string[] {
  return text
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

// Hands each line to the tag it starts with. A line that is neither a tag
// nor a comment is a URI.
function readLines<R>(
  text: string,
  tags: readonly HlsTag<R>[],
  reading: R,
  onUri: (uri: string) => void,
): void {
  for (const line of lines(text)) {
    readLine(line, tags, reading, onUri);
  }
}

function readLine<R>(
  line: string,
  tags: readonly HlsTag<R>[],
  reading: R,
  onUri: (uri: string) => void,
): void {
  const tag = tags.find((candidate) => line.startsWith(candidate.tag));
  if (tag !== undefined) {
    tag.read(line, reading);
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

// The URI after a variant's tag is where that variant is.
function addVariant(reading: MasterReading, uri: string): void {
  if (reading.pending !== undefined) {
    reading.variants.push(
      variant(reading.pending, resolve(uri, reading.baseUrl)),
    );
    reading.pending = undefined;
  }
}

// Where a piece ends, which is where the next one starts when its range only
// gives a length. A piece without a range is a whole file.
function endOf(range: ByteRange | undefined): number {
  return range === undefined ? FILE_START : range.offset + range.length;
}

function addSegment(reading: MediaReading, uri: string): void {
  const range = ifDefined(reading.pendingRange, (spec) =>
    byteRange(spec, reading.previousEnd),
  );
  reading.segments.push({ url: resolve(uri, reading.baseUrl), range });
  reading.previousEnd = endOf(range);
  reading.pendingRange = undefined;
}

// Each read starts from nothing, since reading keeps track of the lines so
// far.
export class HlsPlaylistParser implements HlsParsing {
  constructor(private readonly tags: HlsTags) {}

  isMaster(text: string): boolean {
    return lines(text).some((line) => line.startsWith(STREAM_INF_TAG));
  }

  master(text: string, baseUrl: string): MasterPlaylist {
    const reading: MasterReading = {
      baseUrl,
      variants: [],
      audio: [],
      pending: undefined,
    };
    readLines(text, this.tags.master, reading, (uri) => {
      addVariant(reading, uri);
    });
    return { variants: reading.variants, audio: reading.audio };
  }

  media(text: string, baseUrl: string): MediaPlaylist {
    const reading: MediaReading = {
      baseUrl,
      init: undefined,
      segments: [],
      encrypted: false,
      pendingRange: undefined,
      previousEnd: FILE_START,
    };
    readLines(text, this.tags.media, reading, (uri) => {
      addSegment(reading, uri);
    });
    return {
      init: reading.init,
      segments: reading.segments,
      encrypted: reading.encrypted,
    };
  }
}
