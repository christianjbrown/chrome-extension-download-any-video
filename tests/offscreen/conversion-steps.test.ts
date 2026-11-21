import {
  FetchStep,
  ObjectUrlStep,
  StepChain,
  TranscodeStep,
} from "../../src/offscreen/conversion-steps";

const inputs = { main: new Uint8Array([1]), audio: undefined };
const onProgress = () => undefined;

describe("conversion steps", () => {
  it("fetches the URL it is handed", async () => {
    const fetcher = { fetch: vi.fn().mockResolvedValue(inputs) };

    await expect(
      new FetchStep(fetcher).run("https://x/a.webm", onProgress),
    ).resolves.toBe(inputs);
    expect(fetcher.fetch).toHaveBeenCalledWith("https://x/a.webm", onProgress);
  });

  it("transcodes the inputs it is handed", async () => {
    const bytes = new Uint8Array([2]);
    const transcoder = { transcode: vi.fn().mockResolvedValue(bytes) };

    await expect(
      new TranscodeStep(transcoder).run(inputs, onProgress),
    ).resolves.toBe(bytes);
    expect(transcoder.transcode).toHaveBeenCalledWith(inputs, onProgress);
  });

  it("makes a URL for the bytes it is handed", async () => {
    const urls = { create: vi.fn().mockReturnValue("blob:x/1") };

    await expect(
      new ObjectUrlStep(urls).run(new Uint8Array([2])),
    ).resolves.toBe("blob:x/1");
  });

  it("chains one step onto another, sharing the progress listener", async () => {
    const first = { run: vi.fn().mockResolvedValue(2) };
    const then = { run: vi.fn().mockResolvedValue("3") };

    await expect(new StepChain(first, then).run(1, onProgress)).resolves.toBe(
      "3",
    );
    expect(first.run).toHaveBeenCalledWith(1, onProgress);
    expect(then.run).toHaveBeenCalledWith(2, onProgress);
  });
});
