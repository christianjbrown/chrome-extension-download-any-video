import type { RunResult } from "../../src/offscreen/conversion-parts";
import { Transcoder } from "../../src/offscreen/transcoder";
import { SerialQueue } from "../../src/shared/serial-queue";

function setup() {
  const engine = {
    ready: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
    describe: vi.fn().mockResolvedValue(["Stream #0:0: Video: vp9, yuv420p"]),
    run: vi.fn().mockResolvedValue({ code: 0, complaint: undefined }),
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
    transcoder: new Transcoder({
      engine,
      parser,
      planner,
      queue: new SerialQueue(),
    }),
  };
}

const single = { main: new Uint8Array([1]), audio: undefined };

describe("Transcoder", () => {
  it("writes, describes, plans, runs and reads back, then tidies up", async () => {
    const { engine, parser, planner, transcoder } = setup();
    const progress = vi.fn();

    const out = await transcoder.transcode(single, progress);

    expect(out).toEqual(new Uint8Array([7, 7]));
    expect(engine.ready).toHaveBeenCalled();
    expect(engine.write.mock.calls).toEqual([["input", new Uint8Array([1])]]);
    expect(parser.parse).toHaveBeenCalledWith([
      "Stream #0:0: Video: vp9, yuv420p",
    ]);
    expect(planner.plan).toHaveBeenCalledWith(
      { video: { codec: "vp9", pixelFormat: "yuv420p" } },
      undefined,
    );
    expect(engine.run).toHaveBeenCalledWith(
      ["-i", "input", "output.mp4"],
      progress,
    );
    expect(engine.remove.mock.calls).toEqual([
      ["input"],
      ["audio-input"],
      ["output.mp4"],
    ]);
  });

  it("writes and describes a separate sound track too", async () => {
    const { engine, parser, planner, transcoder } = setup();
    engine.describe
      .mockResolvedValueOnce(["Stream #0:0: Video: h264, yuv420p"])
      .mockResolvedValueOnce(["Stream #0:0: Audio: aac"]);
    parser.parse
      .mockReturnValueOnce({ video: { codec: "h264", pixelFormat: "yuv420p" } })
      .mockReturnValueOnce({ audio: { codec: "aac" } });

    await transcoder.transcode(
      { main: new Uint8Array([1]), audio: new Uint8Array([2]) },
      vi.fn(),
    );

    expect(engine.write.mock.calls).toEqual([
      ["input", new Uint8Array([1])],
      ["audio-input", new Uint8Array([2])],
    ]);
    expect(engine.describe.mock.calls).toEqual([["input"], ["audio-input"]]);
    expect(planner.plan).toHaveBeenCalledWith(
      { video: { codec: "h264", pixelFormat: "yuv420p" } },
      { audio: { codec: "aac" } },
    );
  });

  it("says when ffmpeg gave up, and still tidies up", async () => {
    const { engine, transcoder } = setup();
    engine.run.mockResolvedValue({ code: 234, complaint: undefined });

    await expect(transcoder.transcode(single, vi.fn())).rejects.toThrow(
      "ffmpeg gave up on the video (exit code 234)",
    );
    expect(engine.read).not.toHaveBeenCalled();
    expect(engine.remove).toHaveBeenCalledTimes(3);
  });

  it("runs one job at a time, in the order they came, even after a failure", async () => {
    const { engine, transcoder } = setup();
    const order: string[] = [];
    let finishFirst: () => void = () => undefined;
    engine.run
      .mockImplementationOnce(
        () =>
          new Promise<RunResult>((resolve) => {
            finishFirst = () => {
              order.push("first ran");
              resolve({
                code: 1,
                complaint: "Invalid data found when processing input",
              });
            };
          }),
      )
      .mockImplementationOnce(() => {
        order.push("second ran");
        return Promise.resolve({ code: 0, complaint: undefined });
      });

    const first = transcoder.transcode(single, vi.fn());
    const second = transcoder.transcode(single, vi.fn());
    await vi.waitFor(() => {
      expect(engine.run).toHaveBeenCalledTimes(1);
    });
    expect(order).toEqual([]);
    finishFirst();

    await expect(first).rejects.toThrow(
      "ffmpeg gave up on the video (Invalid data found when processing input)",
    );
    await expect(second).resolves.toEqual(new Uint8Array([7, 7]));
    expect(order).toEqual(["first ran", "second ran"]);
  });
});
