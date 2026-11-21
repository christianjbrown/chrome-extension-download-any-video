// Reads HLS playlists (RFC 8216) line by line. What each tag and each URI
// means is up to the tags the entry points hand the parser.
import type {
  HlsParsing,
  HlsTag,
  HlsTags,
  MasterPlaylist,
  MasterReading,
  MediaPlaylist,
  MediaReading,
  PlaylistTags,
} from "./hls";
import { STREAM_INF_TAG } from "./hls-syntax";

const COMMENT = "#";
const LINE_BREAK = /\r?\n/;

function lines(text: string): string[] {
  return text
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

// Hands each line to the tag it starts with. A line that is neither a tag
// nor a comment is a URI.
function readLines<R>(text: string, tags: PlaylistTags<R>, reading: R): void {
  for (const line of lines(text)) {
    readLine(line, tags, reading);
  }
}

function readLine<R>(line: string, tags: PlaylistTags<R>, reading: R): void {
  const tag = tagFor(line, tags.tags);
  if (tag !== undefined) {
    tag.read(line, reading);
    return;
  }
  uriUnlessComment(line, tags, reading);
}

function tagFor<R>(
  line: string,
  tags: readonly HlsTag<R>[],
): HlsTag<R> | undefined {
  return tags.find((candidate) => line.startsWith(candidate.tag));
}

function uriUnlessComment<R>(
  line: string,
  tags: PlaylistTags<R>,
  reading: R,
): void {
  if (!line.startsWith(COMMENT)) {
    tags.uris.uri(line, reading);
  }
}

// Each read starts from nothing, with tags fresh from the entry point's list.
export class HlsPlaylistParser implements HlsParsing {
  constructor(private readonly tags: HlsTags) {}

  isMaster(text: string): boolean {
    return lines(text).some((line) => line.startsWith(STREAM_INF_TAG));
  }

  master(text: string, baseUrl: string): MasterPlaylist {
    const reading: MasterReading = { baseUrl, variants: [], audio: [] };
    readLines(text, this.tags.master(), reading);
    return { variants: reading.variants, audio: reading.audio };
  }

  media(text: string, baseUrl: string): MediaPlaylist {
    const reading: MediaReading = {
      baseUrl,
      init: undefined,
      segments: [],
      encrypted: false,
    };
    readLines(text, this.tags.media(), reading);
    return {
      init: reading.init,
      segments: reading.segments,
      encrypted: reading.encrypted,
    };
  }
}
