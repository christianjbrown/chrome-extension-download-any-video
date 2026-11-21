// The HLS tags the playlist readers understand, one class each. Another tag
// is another class here and one more entry where the entry points list them.
import { ifDefined } from "../shared/optional";
import type {
  AudioRendition,
  AudioRenditions,
  Attributes,
  Encryption,
  HlsTag,
  InitPiece,
  PendingRange,
  PendingVariant,
} from "./hls";
import {
  ATTRIBUTES,
  attributes,
  byteRange,
  FILE_START,
  given,
  resolve,
  STREAM_INF_TAG,
} from "./hls-syntax";

const MEDIA_TAG = "#EXT-X-MEDIA:";
const KEY_TAG = "#EXT-X-KEY:";
const MAP_TAG = "#EXT-X-MAP:";
const BYTERANGE_TAG = "#EXT-X-BYTERANGE:";
const AUDIO_TYPE = "AUDIO";
const YES = "YES";
const NO_ENCRYPTION = "NONE";

// A variant's size and sound, which the URI on the next line points to.
export class StreamInfTag implements HlsTag<PendingVariant> {
  readonly tag = STREAM_INF_TAG;

  read(line: string, reading: PendingVariant): void {
    reading.pending = attributes(line);
  }
}

function rendition(found: Attributes, url: string): AudioRendition {
  return {
    group: given(found, ATTRIBUTES.groupId),
    url,
    isDefault: found.get(ATTRIBUTES.isDefault) === YES,
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

// A sound track a variant can name by its group.
export class MediaTag implements HlsTag<AudioRenditions> {
  readonly tag = MEDIA_TAG;

  read(line: string, reading: AudioRenditions): void {
    const found = audioRendition(attributes(line), reading.baseUrl);
    if (found !== undefined) {
      reading.audio.push(found);
    }
  }
}

// Any key but none means the pieces are encrypted.
export class KeyTag implements HlsTag<Encryption> {
  readonly tag = KEY_TAG;

  read(line: string, reading: Encryption): void {
    if (attributes(line).get(ATTRIBUTES.method) !== NO_ENCRYPTION) {
      reading.encrypted = true;
    }
  }
}

// The initialisation piece that goes before every segment.
export class MapTag implements HlsTag<InitPiece> {
  readonly tag = MAP_TAG;

  read(line: string, reading: InitPiece): void {
    const found = attributes(line);
    reading.init = {
      url: resolve(given(found, ATTRIBUTES.uri), reading.baseUrl),
      range: ifDefined(found.get(ATTRIBUTES.byteRange), (spec) =>
        byteRange(spec, FILE_START),
      ),
    };
  }
}

// The slice of a file the next segment is.
export class ByteRangeTag implements HlsTag<PendingRange> {
  readonly tag = BYTERANGE_TAG;

  read(line: string, reading: PendingRange): void {
    reading.pendingRange = line.slice(BYTERANGE_TAG.length);
  }
}
