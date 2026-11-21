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
  MasterReading,
  MediaReading,
  UriLine,
  Variant,
} from "./hls";
import {
  ATTRIBUTES,
  attributes,
  byteRange,
  FILE_START,
  given,
  resolve,
  sizeOf,
  STREAM_INF_TAG,
} from "./hls-syntax";
import type { ByteRange } from "./tracks";

const MEDIA_TAG = "#EXT-X-MEDIA:";
const KEY_TAG = "#EXT-X-KEY:";
const MAP_TAG = "#EXT-X-MAP:";
const BYTERANGE_TAG = "#EXT-X-BYTERANGE:";
const AUDIO_TYPE = "AUDIO";
const YES = "YES";
const NO_ENCRYPTION = "NONE";
const RESOLUTION = /^\d+x(\d+)$/;
// Where the height sits in a resolution.
const HEIGHT_GROUP = 1;

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

// A variant's size and sound, which the URI on the next line points to. It
// keeps the attributes until that URI comes, so it is one per playlist.
export class StreamInfTag
  implements HlsTag<MasterReading>, UriLine<MasterReading>
{
  private pending: Attributes | undefined;

  readonly tag = STREAM_INF_TAG;

  read(line: string): void {
    this.pending = attributes(line);
  }

  // A URI that no variant line came before names nothing.
  uri(uri: string, reading: MasterReading): void {
    if (this.pending !== undefined) {
      reading.variants.push(
        variant(this.pending, resolve(uri, reading.baseUrl)),
      );
      this.pending = undefined;
    }
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

// Where a piece ends, which is where the next one starts when its range only
// gives a length. A piece without a range is a whole file.
function endOf(range: ByteRange | undefined): number {
  return range === undefined ? FILE_START : range.offset + range.length;
}

// Each URI of a media playlist as a segment, sliced by the byte range before
// it. It keeps the range until the URI comes, and where the last segment
// ended, so it is one per playlist.
export class ByteRangeTag
  implements HlsTag<MediaReading>, UriLine<MediaReading>
{
  private pending: string | undefined;
  private previousEnd = FILE_START;

  readonly tag = BYTERANGE_TAG;

  read(line: string): void {
    this.pending = line.slice(BYTERANGE_TAG.length);
  }

  uri(uri: string, reading: MediaReading): void {
    const range = ifDefined(this.pending, (spec) =>
      byteRange(spec, this.previousEnd),
    );
    reading.segments.push({ url: resolve(uri, reading.baseUrl), range });
    this.previousEnd = endOf(range);
    this.pending = undefined;
  }
}
