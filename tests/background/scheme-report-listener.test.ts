import { SchemeReportListener } from "../../src/background/scheme-report-listener";

describe("SchemeReportListener", () => {
  it("passes on a colour scheme report and ignores anything else", () => {
    const sink = { deviceIs: vi.fn().mockResolvedValue(undefined) };
    const listener = new SchemeReportListener(sink);

    listener.received({ type: "scheme", scheme: "light" });
    listener.received({ type: "scheme", scheme: "purple" });
    listener.received({ type: "progress" });
    listener.received(undefined);

    expect(sink.deviceIs).toHaveBeenCalledOnce();
    expect(sink.deviceIs).toHaveBeenCalledWith("light");
  });
});
