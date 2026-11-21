import { BusyTabs } from "../../src/background/tab-locks";

describe("BusyTabs", () => {
  it("skips work for a tab whose last work is still going, then takes the next", async () => {
    const lock = new BusyTabs();
    let finish: () => void = () => undefined;
    const first = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const second = vi.fn().mockResolvedValue(undefined);

    const running = lock.runAlone(3, first);
    await lock.runAlone(3, second);
    expect(second).not.toHaveBeenCalled();
    finish();
    await running;
    await lock.runAlone(3, second);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("frees the tab when the work fails", async () => {
    const lock = new BusyTabs();
    await expect(
      lock.runAlone(3, () => Promise.reject(new Error("no"))),
    ).rejects.toThrow("no");
    const next = vi.fn().mockResolvedValue(undefined);
    await lock.runAlone(3, next);
    expect(next).toHaveBeenCalled();
  });

  it("lets two tabs work at once", async () => {
    const lock = new BusyTabs();
    const other = vi.fn().mockResolvedValue(undefined);
    const running = lock.runAlone(1, () => new Promise<void>(() => undefined));
    await lock.runAlone(2, other);
    expect(other).toHaveBeenCalled();
    void running;
  });
});
