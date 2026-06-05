import { describe, expect, test } from "bun:test";
import { getInlineContextMenuViewportOffset } from "./InlineContextMenu";

describe("getInlineContextMenuViewportOffset", () => {
  test("moves an inline menu upward when it overflows the viewport bottom", () => {
    expect(
      getInlineContextMenuViewportOffset({ top: 760, bottom: 900 }, 800, 8),
    ).toBe(-108);
  });

  test("keeps the adjusted inline menu inside the viewport top padding", () => {
    expect(
      getInlineContextMenuViewportOffset({ top: 4, bottom: 904 }, 800, 8),
    ).toBe(4);
  });

  test("returns zero when the inline menu already fits", () => {
    expect(
      getInlineContextMenuViewportOffset({ top: 300, bottom: 480 }, 800, 8),
    ).toBe(0);
  });
});
