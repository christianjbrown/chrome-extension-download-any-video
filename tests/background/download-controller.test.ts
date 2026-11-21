import { DownloadController } from "../../src/background/download-controller";
import { BusyTabs } from "../../src/background/tab-locks";
import type { FrameReport } from "../../src/shared/candidates";
import { fakeIndicator, plainErrors } from "./fakes";

const best = {
  url: "https://cdn.example/hd.mp4",
  origin: "player",
  height: 720,
} as const;

function setup() {
  const reports = [
    { title: "Top", candidates: [best] },
    { title: "Embed", candidates: [] },
  ];
  let release: () => void = () => undefined;
  const source = {
    url: "blob:chrome-extension://x/1",
    extension: "mp4",
    converted: true,
    release: vi.fn().mockResolvedValue(undefined),
  };
  const parts = {
    asker: { ask: vi.fn().mockResolvedValue(reports) },
    filter: {
      filter: vi.fn((given: readonly FrameReport[]) =>
        Promise.resolve([...given]),
      ),
    },
    ranker: { pick: vi.fn().mockReturnValue(best) },
    converter: { convert: vi.fn().mockResolvedValue(source) },
    names: { name: vi.fn().mockReturnValue("top.mp4") },
    saver: {
      save: vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      ),
    },
    indicator: fakeIndicator(),
    errors: plainErrors,
    lock: new BusyTabs(),
  };
  return {
    parts,
    source,
    controller: new DownloadController(parts),
    release: () => {
      release();
    },
  };
}

describe("DownloadController", () => {
  it("finds, converts, names and downloads the video, telling the button as it goes", async () => {
    const { parts, source, controller, release } = setup();
    parts.converter.convert.mockImplementation(
      (_url: string, onProgress: (stage: string, ratio: number) => void) => {
        onProgress("convert", 0.5);
        return Promise.resolve(source);
      },
    );

    const clicked = controller.clicked({ id: 6 });
    await vi.waitFor(() => {
      expect(parts.saver.save).toHaveBeenCalledWith(
        "blob:chrome-extension://x/1",
        "top.mp4",
      );
    });
    expect(parts.indicator.showBusy).toHaveBeenCalledWith(6);
    expect(parts.asker.ask).toHaveBeenCalledWith(6);
    expect(parts.converter.convert).toHaveBeenCalledWith(
      "https://cdn.example/hd.mp4",
      expect.any(Function),
    );
    expect(parts.indicator.showProgress).toHaveBeenCalledWith(
      6,
      "convert",
      0.5,
    );
    expect(parts.names.name).toHaveBeenCalledWith("Top", "mp4");
    expect(source.release).not.toHaveBeenCalled();
    release();
    await clicked;

    expect(source.release).toHaveBeenCalledTimes(1);
    expect(parts.indicator.showDone).toHaveBeenCalledWith(6, {
      filename: "top.mp4",
      converted: true,
    });
    expect(parts.indicator.showError).not.toHaveBeenCalled();
  });

  it("lets the converted video go even when the download fails", async () => {
    const { parts, source, controller } = setup();
    parts.saver.save.mockRejectedValue(
      new Error("Chrome stopped the download"),
    );

    await controller.clicked({ id: 6 });

    expect(source.release).toHaveBeenCalledTimes(1);
    expect(parts.indicator.showError).toHaveBeenCalledWith(
      6,
      "explained: Chrome stopped the download",
    );
  });

  it("ignores a second click while the first is still downloading, then takes the next", async () => {
    const { parts, controller, release } = setup();

    const first = controller.clicked({ id: 6 });
    await vi.waitFor(() => {
      expect(parts.saver.save).toHaveBeenCalledTimes(1);
    });
    await controller.clicked({ id: 6 });
    expect(parts.asker.ask).toHaveBeenCalledTimes(1);
    release();
    await first;
    const second = controller.clicked({ id: 6 });
    await vi.waitFor(() => {
      expect(parts.saver.save).toHaveBeenCalledTimes(2);
    });
    release();
    await second;

    expect(parts.asker.ask).toHaveBeenCalledTimes(2);
  });

  it("shows why when anything fails, in plain words", async () => {
    const { parts, controller } = setup();
    parts.asker.ask.mockRejectedValue(new Error("Cannot access"));

    await controller.clicked({ id: 6 });

    expect(parts.indicator.showError).toHaveBeenCalledWith(
      6,
      "explained: Cannot access",
    );
    expect(parts.saver.save).not.toHaveBeenCalled();
  });

  it("names the file after nothing when no frame answered", async () => {
    const { parts, controller, release } = setup();
    parts.asker.ask.mockResolvedValue([]);
    parts.ranker.pick.mockReturnValue(best);

    const clicked = controller.clicked({ id: 6 });
    await vi.waitFor(() => {
      expect(parts.names.name).toHaveBeenCalledWith("", "mp4");
    });
    release();
    await clicked;
  });

  it("does nothing for a click with no tab", async () => {
    const { parts, controller } = setup();

    await controller.clicked({});

    expect(parts.indicator.showBusy).not.toHaveBeenCalled();
  });
});
