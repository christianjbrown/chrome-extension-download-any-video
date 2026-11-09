import { HttpFetcher, type FetchLike } from "../../src/stream/fetching";
import { decode } from "./fakes";

function responding(status: number, body: string) {
  const fetch = vi.fn<FetchLike>().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(body).buffer),
  });
  return { fetch, fetcher: new HttpFetcher(fetch) };
}

describe("HttpFetcher", () => {
  it("fetches text", async () => {
    const { fetch, fetcher } = responding(200, "#EXTM3U");

    await expect(fetcher.text("https://x/p.m3u8")).resolves.toBe("#EXTM3U");
    expect(fetch).toHaveBeenCalledWith("https://x/p.m3u8", {
      headers: {},
      credentials: "include",
    });
  });

  it("fetches a whole piece", async () => {
    const { fetcher } = responding(200, "bytes");

    expect(decode(await fetcher.bytes("https://x/a.ts"))).toBe("bytes");
  });

  it("asks for a slice with a Range header and takes what the server cut", async () => {
    const { fetch, fetcher } = responding(206, "cde");

    const bytes = await fetcher.bytes("https://x/all.mp4", {
      offset: 2,
      length: 3,
    });

    expect(decode(bytes)).toBe("cde");
    expect(fetch).toHaveBeenCalledWith("https://x/all.mp4", {
      headers: { Range: "bytes=2-4" },
      credentials: "include",
    });
  });

  it("cuts the slice itself when the server sends the whole file", async () => {
    const { fetcher } = responding(200, "abcdefgh");

    const bytes = await fetcher.bytes("https://x/all.mp4", {
      offset: 2,
      length: 3,
    });

    expect(decode(bytes)).toBe("cde");
  });

  it("says what the server answered when it refuses", async () => {
    const { fetcher } = responding(403, "");

    await expect(fetcher.bytes("https://x/a.ts")).rejects.toThrow(
      "The server answered HTTP 403 for a piece of the video",
    );
  });
});
