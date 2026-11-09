import { Transcoder } from "../../src/offscreen/transcoder";

function setup() {
  const engine = {
    ready: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
    describe: vi.fn().mockResolvedValue(["Stream #0:0: Video: vp9, yuv420p"]),
    run: vi.fn().mockResolvedValue(0),
    read: vi.fn().mockResolvedValue(new Uint8Array([7, 7])),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const parser = {
    parse: vi
      .fn()
      .mockReturnValue({ video: { codec: "vp9", pixelFormat: "yuv420p" } }),
  };
  const planner = {
    plan: vi.fn().mockReturnValue(["-i", "input", "output.mp4"]),
  };
  return {
    engine,
    parser,
    planner,
    transcoder: new Transcoder({ engine, parser, planner }),
  };
}

describe("Transcoder", () => {
  it("writes, describes, plans, runs and reads back, then tidies up", async () => {
    const { engine, parser, planner, transcoder } = setup();
    const progress = vi.fn();

    const out = await transcoder.transcode(new Uint8Array([1]), progress);

    expect(out).toEqual(new Uint8Array([7, 7]));
    expect(engine.ready).toHaveBeenCalled();
    expect(engine.write).toHaveBeenCalledWith("input", new Uint8Array([1]));
    expect(parser.parse).toHaveBeenCalledWith([
      "Stream #0:0: Video: vp9, yuv420p",
    ]);
    expect(planner.plan).toHaveBeenCalledWith({
      video: { codec: "vp9", pixelFormat: "yuv420p" },
    });
    expect(engine.run).toHaveBeenCalledWith(
      ["-i", "input", "output.mp4"],
      progress,
    );
    expect(engine.remove.mock.calls).toEqual([["input"], ["output.mp4"]]);
  });

  it("says when ffmpeg gave up, and still tidies up", async () => {
    const { engine, transcoder } = setup();
    engine.run.mockResolvedValue(234);

    await expect(
      transcoder.transcode(new Uint8Array(), vi.fn()),
    ).rejects.toThrow("ffmpeg gave up on the video (exit code 234)");
    expect(engine.read).not.toHaveBeenCalled();
    expect(engine.remove).toHaveBeenCalledTimes(2);
  });

  it("runs one job at a time, in the order they came, even after a failure", async () => {
    const { engine, transcoder } = setup();
    const order: string[] = [];
    let finishFirst: () => void = () => undefined;
    engine.run
      .mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            finishFirst = () => {
              order.push("first ran");
              resolve(1);
            };
          }),
      )
      .mockImplementationOnce(() => {
        order.push("second ran");
        return Promise.resolve(0);
      });

    const first = transcoder.transcode(new Uint8Array(), vi.fn());
    const second = transcoder.transcode(new Uint8Array(), vi.fn());
    await vi.waitFor(() => {
      expect(engine.run).toHaveBeenCalledTimes(1);
    });
    expect(order).toEqual([]);
    finishFirst();

    await expect(first).rejects.toThrow("exit code 1");
    await expect(second).resolves.toEqual(new Uint8Array([7, 7]));
    expect(order).toEqual(["first ran", "second ran"]);
  });
});
