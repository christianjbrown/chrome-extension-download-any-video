import { DownloadController } from "../../src/background/download-controller";
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
  const parts = {
    asker: { ask: vi.fn().mockResolvedValue(reports) },
    ranker: { pick: vi.fn().mockReturnValue(best) },
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
  };
  return {
    parts,
    controller: new DownloadController(parts),
    release: () => {
      release();
    },
  };
}

describe("DownloadController", () => {
  it("finds, names and downloads the video, telling the button as it goes", async () => {
    const { parts, controller, release } = setup();

    const clicked = controller.clicked({ id: 6 });
    await vi.waitFor(() => {
      expect(parts.saver.save).toHaveBeenCalledWith(
        "https://cdn.example/hd.mp4",
        "top.mp4",
      );
    });
    expect(parts.indicator.showBusy).toHaveBeenCalledWith(6);
    expect(parts.asker.ask).toHaveBeenCalledWith(6);
    expect(parts.names.name).toHaveBeenCalledWith(
      "Top",
      "https://cdn.example/hd.mp4",
    );
    release();
    await clicked;

    expect(parts.indicator.showDone).toHaveBeenCalledWith(6, "top.mp4");
    expect(parts.indicator.showError).not.toHaveBeenCalled();
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
      expect(parts.names.name).toHaveBeenCalledWith(
        "",
        "https://cdn.example/hd.mp4",
      );
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
