import { VideoSaver } from "../../src/background/video-saver";

describe("VideoSaver", () => {
  it("downloads under the given name and waits for the file", async () => {
    const downloads = { download: vi.fn().mockResolvedValue(12) };
    const completion = { finished: vi.fn().mockResolvedValue(undefined) };

    await new VideoSaver(downloads, completion).save(
      "https://x/cat.mp4",
      "cat.mp4",
    );

    expect(downloads.download).toHaveBeenCalledWith({
      url: "https://x/cat.mp4",
      filename: "cat.mp4",
      saveAs: false,
      conflictAction: "uniquify",
    });
    expect(completion.finished).toHaveBeenCalledWith(12);
  });

  it("passes on Chrome's refusal", async () => {
    const downloads = { download: vi.fn().mockRejectedValue(new Error("no")) };
    const completion = { finished: vi.fn() };

    await expect(
      new VideoSaver(downloads, completion).save("https://x/a.mp4", "a.mp4"),
    ).rejects.toThrow("no");
    expect(completion.finished).not.toHaveBeenCalled();
  });
});
