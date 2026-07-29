import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import {
  EditorSessionProvider,
  useEditorSessionStore,
} from "./EditorSessionContext";

describe("EditorSessionContext", () => {
  test("stores high-frequency editor state per tab and clears it on close", () => {
    const { result } = renderHook(() => useEditorSessionStore(), {
      wrapper: EditorSessionProvider,
    });
    act(() => {
      result.current.updateSession("tab-1", {
        selection: { anchor: 3, head: 8 },
        viewport: { scrollTop: 120, scrollLeft: 4 },
      });
      result.current.updateSession("tab-1", {
        splitLayout: [65, 35],
        hadFocus: true,
      });
    });
    expect(result.current.getSession("tab-1")).toEqual({
      selection: { anchor: 3, head: 8 },
      viewport: { scrollTop: 120, scrollLeft: 4 },
      splitLayout: [65, 35],
      hadFocus: true,
    });

    act(() => result.current.clearSession("tab-1"));
    expect(result.current.getSession("tab-1")).toBeUndefined();
  });

  test("keeps sessions isolated by tab id", () => {
    const { result } = renderHook(() => useEditorSessionStore(), {
      wrapper: EditorSessionProvider,
    });
    act(() => {
      result.current.updateSession("tab-1", { splitLayout: [60, 40] });
      result.current.updateSession("tab-2", { splitLayout: [30, 70] });
    });
    expect(result.current.getSession("tab-1")?.splitLayout).toEqual([60, 40]);
    expect(result.current.getSession("tab-2")?.splitLayout).toEqual([30, 70]);
  });
});
