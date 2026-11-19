import {
  CLOSED_TAB_ERROR,
  ClosedTabAction,
} from "../../src/background/closed-tab-action";

const closed = new Error("No tab with id: 813852304.");

function action() {
  return {
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
  };
}

const calls = [
  {
    name: "setBadgeText",
    call: (target: ClosedTabAction) =>
      target.setBadgeText({ tabId: 5, text: "!" }),
    details: { tabId: 5, text: "!" },
  },
  {
    name: "setBadgeBackgroundColor",
    call: (target: ClosedTabAction) =>
      target.setBadgeBackgroundColor({ tabId: 5, color: "#000" }),
    details: { tabId: 5, color: "#000" },
  },
  {
    name: "setTitle",
    call: (target: ClosedTabAction) =>
      target.setTitle({ tabId: 5, title: "Hi" }),
    details: { tabId: 5, title: "Hi" },
  },
] as const;

describe("ClosedTabAction", () => {
  it.each(calls)(
    "passes $name through to Chrome",
    async ({ name, call, details }) => {
      const chrome = action();

      await call(new ClosedTabAction(chrome));

      expect(chrome[name]).toHaveBeenCalledWith(details);
    },
  );

  it.each(calls)(
    "does nothing when $name names a tab that has closed",
    async ({ name, call }) => {
      const chrome = action();
      chrome[name].mockRejectedValue(closed);

      await expect(call(new ClosedTabAction(chrome))).resolves.toBeUndefined();
    },
  );

  it.each(calls)(
    "still fails $name for any other error",
    async ({ name, call }) => {
      const chrome = action();
      const other = new Error("Invalid color");
      chrome[name].mockRejectedValue(other);

      await expect(call(new ClosedTabAction(chrome))).rejects.toBe(other);
    },
  );

  it("recognises Chrome's closed tab message when it is not an Error", async () => {
    const chrome = action();
    chrome.setTitle.mockRejectedValue("No tab with id: 9.");

    await expect(
      new ClosedTabAction(chrome).setTitle({ tabId: 9, title: "Hi" }),
    ).resolves.toBeUndefined();
  });

  it("only matches a message that starts with Chrome's wording", () => {
    expect(CLOSED_TAB_ERROR.test("No tab with id: 12.")).toBe(true);
    expect(CLOSED_TAB_ERROR.test("Wrapped: No tab with id: 12.")).toBe(false);
  });
});
