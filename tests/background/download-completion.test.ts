import { DownloadWatcher } from "../../src/background/download-completion";

type Delta = Parameters<typeof fire>[0];

const listeners: ((delta: Delta) => void)[] = [];
const downloads = {
  onChanged: {
    addListener: vi.fn((listener: (delta: Delta) => void) =>
      listeners.push(listener),
    ),
    removeListener: vi.fn((listener: (delta: Delta) => void) => {
      listeners.splice(listeners.indexOf(listener), 1);
    }),
  },
};
function fire(delta: {
  id: number;
  state?: { current?: string };
  error?: { current?: string };
}) {
  for (const listener of [...listeners]) listener(delta);
}

describe("DownloadWatcher", () => {
  beforeEach(() => {
    listeners.length = 0;
  });

  it("settles when its download completes, ignoring other downloads and other changes", async () => {
    const finished = new DownloadWatcher(downloads).finished(5);

    fire({ id: 6, state: { current: "complete" } });
    fire({ id: 5 });
    fire({ id: 5, state: { current: "in_progress" } });
    expect(listeners).toHaveLength(1);
    fire({ id: 5, state: { current: "complete" } });

    await expect(finished).resolves.toBeUndefined();
    expect(listeners).toHaveLength(0);
  });

  it("fails with Chrome's reason when the download is interrupted", async () => {
    const finished = new DownloadWatcher(downloads).finished(5);

    fire({
      id: 5,
      state: { current: "interrupted" },
      error: { current: "NETWORK_FAILED" },
    });

    await expect(finished).rejects.toThrow(
      "Chrome stopped the download (NETWORK_FAILED)",
    );
    expect(listeners).toHaveLength(0);
  });

  it("says so when Chrome gives no reason", async () => {
    const finished = new DownloadWatcher(downloads).finished(5);

    fire({ id: 5, state: { current: "interrupted" } });

    await expect(finished).rejects.toThrow(
      "Chrome stopped the download (no reason given)",
    );
  });
});
