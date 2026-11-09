import type { ByteFetcher, TextFetcher } from "../../src/stream/fetching";
import type { Progress } from "../../src/stream/progress";
import type { ByteRange } from "../../src/stream/tracks";
import type { XmlElement } from "../../src/stream/xml";

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
