import {
  VideoFetcher,
  type FetchedResponse,
} from "../../src/offscreen/video-fetcher";

function response(
  chunks: Uint8Array[],
  options: { ok?: boolean; status?: number; length?: string; body?: null } = {},
): FetchedResponse {
  const body =
    options.body === null
      ? null
      : new ReadableStream<Uint8Array>({
          start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(chunk);
            }
            controller.close();
          },
        });
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    headers: { get: () => options.length ?? null },
    body,
  };
}

describe("VideoFetcher", () => {
  it("fetches the whole file with the site's cookies, reporting how far it got", async () => {
    const fetchUrl = vi.fn().mockResolvedValue(
      response(
        [new Uint8Array([1, 2]), new Uint8Array([3, 4]), new Uint8Array([5])],
        {
          length: "5",
        },
      ),
    );
    const progress = vi.fn();

    const data = await new VideoFetcher(fetchUrl).fetch(
      "https://x/a.webm",
      progress,
    );

    expect(data).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(fetchUrl).toHaveBeenCalledWith("https://x/a.webm", {
      credentials: "include",
    });
    expect(progress.mock.calls).toEqual([[0.4], [0.8], [1]]);
  });

  it("says nothing about progress when the server did not say how big the file is", async () => {
    const fetchUrl = vi.fn().mockResolvedValue(response([new Uint8Array([1])]));
    const progress = vi.fn();

    await new VideoFetcher(fetchUrl).fetch("https://x/a.webm", progress);

    expect(progress).not.toHaveBeenCalled();
  });

  it("never claims more than the whole when the server undercounted", async () => {
    const fetchUrl = vi
      .fn()
      .mockResolvedValue(
        response([new Uint8Array([1, 2, 3])], { length: "2" }),
      );
    const progress = vi.fn();

    await new VideoFetcher(fetchUrl).fetch("https://x/a.webm", progress);

    expect(progress).toHaveBeenCalledWith(1);
  });

  it("refuses a bad status or an empty answer", async () => {
    const refused = new VideoFetcher(
      vi.fn().mockResolvedValue(response([], { ok: false, status: 403 })),
    );
    await expect(refused.fetch("https://x/a.webm", vi.fn())).rejects.toThrow(
      "The server answered 403 for the video",
    );

    const empty = new VideoFetcher(
      vi.fn().mockResolvedValue(response([], { body: null })),
    );
    await expect(empty.fetch("https://x/a.webm", vi.fn())).rejects.toThrow(
      "The server sent an empty answer for the video",
    );
  });
});
