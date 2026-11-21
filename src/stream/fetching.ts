// Fetching the playlists and pieces of a stream.
import type { ByteFetcher, TextFetcher } from "./fetchers";
import type { ByteRange } from "./tracks";

interface FetchedResponse {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface FetchInit {
  readonly headers: Record<string, string>;
  readonly credentials: typeof WITH_COOKIES;
}

// The one piece of fetch this needs, so it can be swapped for a fake.
export type FetchLike = (
  url: string,
  init: FetchInit,
) => Promise<FetchedResponse>;

const RANGE_HEADER = "Range";
const RANGE_UNIT = "bytes";
const PARTIAL_CONTENT = 206;
// Cookies go along, as they would from the page, so pieces that need the
// site's session still arrive.
export const WITH_COOKIES = "include";

const refused = (status: number): string =>
  `The server answered HTTP ${String(status)} for a piece of the video`;

export class HttpFetcher implements TextFetcher, ByteFetcher {
  constructor(private readonly fetch: FetchLike) {}

  async text(url: string): Promise<string> {
    return (await this.fetched(url, {})).text();
  }

  // A piece that is a slice of a file is asked for with a Range header. A
  // server that sends the whole file regardless gets sliced here instead.
  bytes(url: string, range?: ByteRange): Promise<ArrayBuffer> {
    return range === undefined ? this.whole(url) : this.slice(url, range);
  }

  private async whole(url: string): Promise<ArrayBuffer> {
    return (await this.fetched(url, {})).arrayBuffer();
  }

  private async slice(url: string, range: ByteRange): Promise<ArrayBuffer> {
    const end = range.offset + range.length;
    const response = await this.fetched(url, {
      [RANGE_HEADER]: `${RANGE_UNIT}=${String(range.offset)}-${String(end - 1)}`,
    });
    const buffer = await response.arrayBuffer();
    return response.status === PARTIAL_CONTENT
      ? buffer
      : buffer.slice(range.offset, end);
  }

  private async fetched(
    url: string,
    headers: Record<string, string>,
  ): Promise<FetchedResponse> {
    const response = await this.fetch(url, {
      headers,
      credentials: WITH_COOKIES,
    });
    if (!response.ok) {
      throw new Error(refused(response.status));
    }
    return response;
  }
}
