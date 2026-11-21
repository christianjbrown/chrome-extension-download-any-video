import { WITH_COOKIES } from "../stream/fetching";
import { concatenate } from "./bytes";
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

export interface Fetches {
  fetch(url: string, onProgress: ProgressListener): Promise<MediaInputs>;
}

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
    const response = await this.fetchUrl(url, { credentials: WITH_COOKIES });
    if (!response.ok) {
      throw new Error(refused(response.status));
    }
    if (response.body === null) {
      throw new Error(EMPTY_ANSWER);
    }
    const total = Number(
      response.headers.get(CONTENT_LENGTH) ?? UNKNOWN_LENGTH,
    );
    const chunks: Uint8Array[] = [];
    let received = 0;
    const reader = response.body.getReader();
    for (
      let next = await reader.read();
      !next.done;
      next = await reader.read()
    ) {
      chunks.push(next.value);
      received += next.value.length;
      if (total > UNKNOWN_LENGTH) {
        onProgress(Math.min(received / total, ALL_DONE));
      }
    }
    return { main: concatenate(chunks), audio: undefined };
  }
}
