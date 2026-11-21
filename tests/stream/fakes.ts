import {
  SegmentListSource,
  SegmentTemplateSource,
} from "../../src/stream/dash-pieces";
import type { ByteFetcher, TextFetcher } from "../../src/stream/fetchers";
import type { HlsTags } from "../../src/stream/hls";
import {
  ByteRangeTag,
  KeyTag,
  MapTag,
  MediaTag,
  StreamInfTag,
} from "../../src/stream/hls-tags";
import type { Progress } from "../../src/stream/progress";
import type { StreamRefusals } from "../../src/stream/refusals";
import type { ByteRange } from "../../src/stream/tracks";
import type { XmlElement } from "../../src/stream/xml";
import { XmlReader } from "../../src/stream/xml-parser";
import {
  CdataPart,
  ChildElementPart,
  CommentPart,
  DeclarationPart,
  InstructionPart,
} from "../../src/stream/xml-parts";

// Serves fixed texts by URL, and bytes that spell out what was asked for.
export class FakeFetcher implements TextFetcher, ByteFetcher {
  readonly asked: { url: string; range: ByteRange | undefined }[] = [];

  constructor(private readonly texts: Record<string, string> = {}) {}

  text(url: string): Promise<string> {
    const text = this.texts[url];
    return text === undefined
      ? Promise.reject(new Error(`no text at ${url}`))
      : Promise.resolve(text);
  }

  bytes(url: string, range?: ByteRange): Promise<ArrayBuffer> {
    this.asked.push({ url, range });
    const label =
      range === undefined
        ? url
        : `${url}@${String(range.offset)}+${String(range.length)}`;
    return Promise.resolve(new TextEncoder().encode(label).buffer);
  }
}

export class RecordingProgress implements Progress {
  readonly reports: [number, number][] = [];

  report(done: number, total: number): void {
    this.reports.push([done, total]);
  }
}

interface Options {
  attributes?: Record<string, string>;
  children?: XmlElement[];
  text?: string;
}

export function xml(name: string, options: Options = {}): XmlElement {
  return {
    name,
    text: options.text ?? "",
    children: options.children ?? [],
    attribute: (attribute) => options.attributes?.[attribute],
  };
}

export const decode = (buffer: ArrayBuffer): string =>
  new TextDecoder().decode(buffer);

// The piece sources the entry points hand a DASH parser, in their order.
export const pieceSources = [
  new SegmentListSource(),
  new SegmentTemplateSource(),
];

// The HLS tags the entry points hand a playlist parser.
export const hlsTags: HlsTags = {
  master: () => {
    const variants = new StreamInfTag();
    return { tags: [variants, new MediaTag()], uris: variants };
  },
  media: () => {
    const segments = new ByteRangeTag();
    return { tags: [new KeyTag(), new MapTag(), segments], uris: segments };
  },
};

// Parses XML with the parts the entry points list, in their order.
export const xmlReader = new XmlReader({
  prolog: [new CommentPart(), new InstructionPart(), new DeclarationPart()],
  content: [
    new CommentPart(),
    new CdataPart(),
    new InstructionPart(),
    new ChildElementPart(),
  ],
});

// Refusal wording for the readers, one word each so a test sees which applied.
export const refusals: StreamRefusals = {
  encrypted: "encrypted",
  live: "live",
  noStreams: "no streams",
  emptyPlaylist: "empty playlist",
};
