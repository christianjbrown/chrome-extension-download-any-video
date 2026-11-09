import { NavigationReset } from "../../src/background/navigation-reset";
import { fakeIndicator } from "./fakes";

describe("NavigationReset", () => {
  it("clears the button when the tab starts loading a new page", async () => {
    const indicator = fakeIndicator();

    await new NavigationReset(indicator).changed(4, { status: "loading" });

    expect(indicator.showIdle).toHaveBeenCalledWith(4);
  });

  it("leaves the button alone for any other change", async () => {
    const indicator = fakeIndicator();

    await new NavigationReset(indicator).changed(4, { status: "complete" });
    await new NavigationReset(indicator).changed(4, {});

    expect(indicator.showIdle).not.toHaveBeenCalled();
  });
});
