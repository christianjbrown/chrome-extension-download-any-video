import { ConversionHost } from "../../src/background/conversion-host";

function setup() {
  const page = {
    open: vi.fn().mockResolvedValue(undefined),
    renew: vi.fn().mockResolvedValue(undefined),
  };
  return { page, host: new ConversionHost(page) };
}

describe("ConversionHost", () => {
  it("makes sure the hidden page is there for each conversion", async () => {
    const { page, host } = setup();

    await host.open();
    await host.open();

    expect(page.open).toHaveBeenCalledTimes(2);
    expect(page.renew).not.toHaveBeenCalled();
  });

  it("keeps the page while another conversion is still using it", async () => {
    const { page, host } = setup();
    await host.open();
    await host.open();

    await host.release();

    expect(page.renew).not.toHaveBeenCalled();
  });

  it("swaps the page for a fresh one when the last conversion lets go", async () => {
    const { page, host } = setup();
    await host.open();
    await host.open();

    await host.release();
    await host.release();

    expect(page.renew).toHaveBeenCalledTimes(1);
  });

  it("gives every run of conversions its own fresh page", async () => {
    const { page, host } = setup();

    await host.open();
    await host.release();
    await host.open();
    await host.release();

    expect(page.renew).toHaveBeenCalledTimes(2);
  });

  it("passes on a refusal and does not count the conversion that never started", async () => {
    const { page, host } = setup();
    page.open.mockRejectedValueOnce(new Error("no offscreen for you"));

    await expect(host.open()).rejects.toThrow("no offscreen for you");
    await host.open();
    await host.release();

    expect(page.renew).toHaveBeenCalledTimes(1);
  });
});
