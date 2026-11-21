import { SourceFetcher } from "../../src/offscreen/source-fetcher";
import { media } from "../shared/media";

describe("SourceFetcher", () => {
  const fetcher = (name: string) => ({
    fetch: vi.fn().mockResolvedValue({ main: name, audio: undefined }),
  });
  const fetchers = { file: fetcher("file"), playlist: fetcher("playlist") };
  const source = new SourceFetcher(fetchers, media);
  const progress = vi.fn();

  it("fetches a whole file and a playlist each their own way", async () => {
    await expect(source.fetch("https://x/a.webm", progress)).resolves.toEqual({
      main: "file",
      audio: undefined,
    });
    await expect(source.fetch("https://x/v.m3u8", progress)).resolves.toEqual({
      main: "playlist",
      audio: undefined,
    });
    expect(fetchers.playlist.fetch).toHaveBeenCalledWith(
      "https://x/v.m3u8",
      progress,
    );
  });

  it("takes an address that says nothing for a whole file", async () => {
    await source.fetch("https://x/video?id=1", progress);

    expect(fetchers.file.fetch).toHaveBeenLastCalledWith(
      "https://x/video?id=1",
      progress,
    );
  });
});
