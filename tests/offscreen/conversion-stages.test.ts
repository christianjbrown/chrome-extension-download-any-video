import { NamedStage, StageChain } from "../../src/offscreen/conversion-stages";

const reporter = () => vi.fn();

describe("NamedStage", () => {
  it("hands on what its step made, reporting under its own name", async () => {
    const listener = vi.fn();
    const stageReporter = vi.fn().mockReturnValue(listener);
    const step = {
      run: vi.fn((input: number, onProgress: (ratio: number) => void) => {
        onProgress(0.5);
        return Promise.resolve(input + 1);
      }),
    };

    await expect(
      new NamedStage("fetch", step).run(1, stageReporter),
    ).resolves.toEqual({ ok: true, value: 2 });
    expect(stageReporter).toHaveBeenCalledWith("fetch");
    expect(listener).toHaveBeenCalledWith(0.5);
  });

  it("says its step failed, under its own name", async () => {
    const step = { run: vi.fn().mockRejectedValue(new Error("broke")) };

    await expect(
      new NamedStage("convert", step).run(1, reporter()),
    ).resolves.toEqual({ ok: false, stage: "convert", message: "broke" });
  });
});

describe("StageChain", () => {
  it("runs the next stage on what the first handed on", async () => {
    const first = { run: vi.fn().mockResolvedValue({ ok: true, value: 2 }) };
    const then = { run: vi.fn().mockResolvedValue({ ok: true, value: "3" }) };
    const stageReporter = reporter();

    await expect(
      new StageChain(first, then).run(1, stageReporter),
    ).resolves.toEqual({ ok: true, value: "3" });
    expect(first.run).toHaveBeenCalledWith(1, stageReporter);
    expect(then.run).toHaveBeenCalledWith(2, stageReporter);
  });

  it("stops at the first stage that fails", async () => {
    const failure = { ok: false, stage: "fetch", message: "403" } as const;
    const first = { run: vi.fn().mockResolvedValue(failure) };
    const then = { run: vi.fn() };

    await expect(new StageChain(first, then).run(1, reporter())).resolves.toBe(
      failure,
    );
    expect(then.run).not.toHaveBeenCalled();
  });
});
