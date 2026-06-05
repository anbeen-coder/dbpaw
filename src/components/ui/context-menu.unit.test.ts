import { describe, expect, test } from "bun:test";
import { getContextMenuViewportOffset } from "./context-menu";

describe("getContextMenuViewportOffset", () => {
  test("moves a menu upward when it overflows the viewport bottom", () => {
    expect(
      getContextMenuViewportOffset({ top: 760, bottom: 860 }, 800, 8),
    ).toBe(-68);
  });

  test("keeps the adjusted menu inside the viewport top padding", () => {
    expect(
      getContextMenuViewportOffset({ top: 4, bottom: 904 }, 800, 8),
    ).toBe(4);
  });

  test("returns zero when the menu already fits", () => {
    expect(
      getContextMenuViewportOffset({ top: 200, bottom: 320 }, 800, 8),
    ).toBe(0);
  });
});
