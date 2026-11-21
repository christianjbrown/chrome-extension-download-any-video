// Part of the entry points' wiring: the playlist and manifest parsers both the
// service worker and the offscreen document read streams with, built here so
// each list is written once.
import { DashManifestParser } from "../stream/dash-manifest";
import {
  SegmentListSource,
  SegmentTemplateSource,
} from "../stream/dash-pieces";
import { HlsPlaylistParser } from "../stream/hls-playlist";
import {
  ByteRangeTag,
  KeyTag,
  MapTag,
  MediaTag,
  StreamInfTag,
} from "../stream/hls-tags";
import { XmlReader } from "../stream/xml-parser";
import {
  CdataPart,
  ChildElementPart,
  CommentPart,
  DeclarationPart,
  InstructionPart,
} from "../stream/xml-parts";

// The HLS tags each kind of playlist is read with. Another tag is another
// class and one more entry here.
export function hlsPlaylistParser(): HlsPlaylistParser {
  return new HlsPlaylistParser({
    master: [new StreamInfTag(), new MediaTag()],
    media: [new KeyTag(), new MapTag(), new ByteRangeTag()],
  });
}

// The kinds of markup the XML scanner knows, each list tried in order: a
// comment before a declaration or CDATA, since all of them start with "<!",
// and any other tag last. Another kind is another class and one entry here.
// The ways a DASH manifest names its pieces come most specific first, and
// another way is another entry here too.
export function dashManifestParser(): DashManifestParser {
  return new DashManifestParser(
    new XmlReader({
      prolog: [new CommentPart(), new InstructionPart(), new DeclarationPart()],
      content: [
        new CommentPart(),
        new CdataPart(),
        new InstructionPart(),
        new ChildElementPart(),
      ],
    }),
    [new SegmentListSource(), new SegmentTemplateSource()],
  );
}
