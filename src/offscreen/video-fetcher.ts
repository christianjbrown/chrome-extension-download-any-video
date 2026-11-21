import { WITH_COOKIES } from "../stream/fetching";
import { concatenate } from "./bytes";
import type { Fetches } from "./conversion-parts";
import type { MediaInputs } from "./media-inputs";
import type { ProgressListener } from "./progress";

// The slice of a fetch Response this reads.
export interface FetchedResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  readonly body: ReadableStream<Uint8Array> | null;
}

export type Fetch = (
  url: string,
  init: RequestInit,
) => Promise<FetchedResponse>;

const EMPTY_ANSWER = "The server sent an empty answer for the video";
const refused = (status: number): string =>
  `The server answered ${String(status)} for the video`;

const CONTENT_LENGTH = "content-length";
const UNKNOWN_LENGTH = 0;
const ALL_DONE = 1;

// Pulls the whole video into memory, saying how far along it is when the
// server said how big the file is. Cookies go along, as they would from the
// page, so a video that needs the site's session still arrives.
export class VideoFetcher implements Fetches {
  constructor(private readonly fetchUrl: Fetch) {}

  async fetch(url: string, onProgress: ProgressListener): Promise<MediaInputs> {
    const response = accepted(
      await this.fetchUrl(url, { credentials: WITH_COOKIES }),
    );
    const body = bodyOf(response);
    const main = await readAll(
      body.getReader(),
      progressOf(totalOf(response), onProgress),
    );
    return { main, audio: undefined };
  }
}

function accepted(response: FetchedResponse): FetchedResponse {
  if (!response.ok) {
    throw new Error(refused(response.status));
  }
  return response;
}

function bodyOf(response: FetchedResponse): ReadableStream<Uint8Array> {
  if (response.body === null) {
    throw new Error(EMPTY_ANSWER);
  }
  return response.body;
}

function totalOf(response: FetchedResponse): number {
  return Number(response.headers.get(CONTENT_LENGTH) ?? UNKNOWN_LENGTH);
}

// How far along the bytes so far are, said only when the server gave a size.
function progressOf(
  total: number,
  onProgress: ProgressListener,
): (received: number) => void {
  return (received) => {
    if (total > UNKNOWN_LENGTH) {
      onProgress(Math.min(received / total, ALL_DONE));
    }
  };
}

async function readAll(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onReceived: (received: number) => void,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    chunks.push(next.value);
    received += next.value.length;
    onReceived(received);
  }
  return concatenate(chunks);
}
