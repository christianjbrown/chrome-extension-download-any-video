import { RuntimeProgress } from "../../src/offscreen/runtime-progress";

const report = {
  type: "progress",
  jobId: "j1",
  stage: "fetch",
  ratio: 0.5,
} as const;

describe("RuntimeProgress", () => {
  it("sends each report to the service worker", () => {
    const channel = { sendMessage: vi.fn().mockResolvedValue(undefined) };

    new RuntimeProgress(channel).send(report);

    expect(channel.sendMessage).toHaveBeenCalledWith(report);
  });

  it("does not mind when nobody is listening", async () => {
    const sent = Promise.reject(new Error("Receiving end does not exist"));
    const channel = { sendMessage: vi.fn().mockReturnValue(sent) };

    expect(() => {
      new RuntimeProgress(channel).send(report);
    }).not.toThrow();
    await expect(sent.catch(() => "settled")).resolves.toBe("settled");
  });
});
