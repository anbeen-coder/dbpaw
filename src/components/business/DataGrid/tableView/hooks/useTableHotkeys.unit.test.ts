import { mock } from "bun:test";

const isEditableTargetMock = mock(() => false);
mock.module("@/lib/keyboard", () => ({
  isEditableTarget: isEditableTargetMock,
}));

const BINDINGS: Record<string, string> = {
  "table.save": "Mod+S",
  "table.openSearch": "Mod+F",
  "table.copySelection": "Mod+C",
  "table.cancelEdit": "Escape",
};

const shortcutMatcher = (
  e: KeyboardEvent,
  id: string,
): boolean => {
  const combo = BINDINGS[id];
  if (!combo) return false;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { matchShortcut } = require("@/lib/shortcuts/match");
  return matchShortcut(e, combo, { isMacOS: true });
};

mock.module("@/contexts/ShortcutsContext", () => ({
  useShortcutMatcher: () => shortcutMatcher,
}));

import { describe, test, expect, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useTableHotkeys } from "./useTableHotkeys";

const KeyboardEventCtor =
  typeof KeyboardEvent !== "undefined"
    ? KeyboardEvent
    : (window as unknown as { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent;

function kb(
  code: string,
  opts: Partial<{
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    target: EventTarget;
  }> = {},
): KeyboardEvent {
  const keyMap: Record<string, string> = {
    KeyC: "c",
    KeyS: "s",
    KeyF: "f",
    Escape: "Escape",
  };
  return new KeyboardEventCtor("keydown", {
    bubbles: true,
    cancelable: true,
    code,
    key: keyMap[code] ?? code,
    metaKey: opts.metaKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    altKey: opts.altKey ?? false,
    shiftKey: opts.shiftKey ?? false,
  });
}

function createContainer(): HTMLDivElement {
  return document.createElement("div");
}

function defaults(overrides: Record<string, unknown> = {}) {
  const container = createContainer();
  const saveButton = document.createElement("button");
  return {
    containerRef: { current: container },
    editingCell: null as { row: number; col: string } | null,
    hasPendingChanges: false,
    isSaving: false,
    saveButtonRef: { current: saveButton },
    setIsSearchOpen: mock(),
    focusSearchInput: mock(),
    selectedRowsRef: { current: new Set<number>() },
    cellSelectionRangeRef: { current: null },
    buildRowsTSV: mock(() => "tsv"),
    getSelectedCellCopyText: mock(() => null as string | null),
    handleCopy: mock(),
    handleCopySelection: mock(),
    cancelEdit: mock(),
    handleDiscardChanges: mock(),
    ...overrides,
  } as Parameters<typeof useTableHotkeys>[0];
}

describe("useTableHotkeys", () => {
  beforeEach(() => {
    isEditableTargetMock.mockReturnValue(false);
  });

  describe("Cmd+S — save (table context guard)", () => {
    test("clicks save button when has pending changes and inside table", () => {
      const params = defaults({
        hasPendingChanges: true,
      });
      const clickSpy = mock();
      params.saveButtonRef.current = { click: clickSpy } as unknown as HTMLButtonElement;

      renderHook(() => useTableHotkeys(params));

      const event = kb("KeyS", { metaKey: true });
      window.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    test("clicks save when editing cell even if not inside table", () => {
      const params = defaults({
        editingCell: { row: 0, col: "name" },
        hasPendingChanges: true,
      });
      const clickSpy = mock();
      params.saveButtonRef.current = { click: clickSpy } as unknown as HTMLButtonElement;

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyS", { metaKey: true }));

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    test("does NOT click save when outside table, no editing, no pending changes", () => {
      const params = defaults({
        hasPendingChanges: false,
        editingCell: null,
      });
      const clickSpy = mock();
      params.saveButtonRef.current = { click: clickSpy } as unknown as HTMLButtonElement;

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyS", { metaKey: true }));

      expect(clickSpy).not.toHaveBeenCalled();
    });

    test("does NOT click save when isSaving is true", () => {
      const params = defaults({
        hasPendingChanges: true,
        isSaving: true,
      });
      const clickSpy = mock();
      params.saveButtonRef.current = { click: clickSpy } as unknown as HTMLButtonElement;

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyS", { metaKey: true }));

      expect(clickSpy).not.toHaveBeenCalled();
    });

    test("prevents default on save", () => {
      const params = defaults({ hasPendingChanges: true });
      renderHook(() => useTableHotkeys(params));

      const event = kb("KeyS", { metaKey: true });
      const spy = mock();
      event.preventDefault = spy;
      window.dispatchEvent(event);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Cmd+C — copy (row selection, range selection, cell copy)", () => {
    test("copies selected rows as TSV", () => {
      const buildRowsTSV = mock(() => "row1\tAlice\nrow2\tBob");
      const handleCopy = mock();
      const params = defaults({
        selectedRowsRef: { current: new Set([0, 1]) },
        buildRowsTSV,
        handleCopy,
      });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyC", { metaKey: true }));

      expect(buildRowsTSV).toHaveBeenCalledWith([0, 1]);
      expect(handleCopy).toHaveBeenCalledWith("row1\tAlice\nrow2\tBob");
    });

    test("calls handleCopySelection when cell selection range exists", () => {
      const handleCopySelection = mock();
      const params = defaults({
        cellSelectionRangeRef: {
          current: { anchor: { row: 0, colIndex: 0 }, tip: { row: 1, colIndex: 1 } },
        },
        handleCopySelection,
      });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyC", { metaKey: true }));

      expect(handleCopySelection).toHaveBeenCalledTimes(1);
    });

    test("copies single cell text when no rows or range selected", () => {
      const getSelectedCellCopyText = mock(() => "cell-value");
      const handleCopy = mock();
      const params = defaults({
        getSelectedCellCopyText,
        handleCopy,
      });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyC", { metaKey: true }));

      expect(getSelectedCellCopyText).toHaveBeenCalled();
      expect(handleCopy).toHaveBeenCalledWith("cell-value");
    });

    test("does nothing when no cell selected (getSelectedCellCopyText returns null)", () => {
      const handleCopy = mock();
      const params = defaults({
        getSelectedCellCopyText: mock(() => null),
        handleCopy,
      });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyC", { metaKey: true }));

      expect(handleCopy).not.toHaveBeenCalled();
    });

    test("skips copy when target is an editable element", () => {
      isEditableTargetMock.mockReturnValue(true);
      const handleCopy = mock();
      const params = defaults({
        selectedRowsRef: { current: new Set([0]) },
        handleCopy,
      });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyC", { metaKey: true }));

      expect(handleCopy).not.toHaveBeenCalled();
    });

    test("prevents default on copy when rows are selected", () => {
      const params = defaults({
        selectedRowsRef: { current: new Set([0]) },
      });

      renderHook(() => useTableHotkeys(params));

      const event = kb("KeyC", { metaKey: true });
      const spy = mock();
      event.preventDefault = spy;
      window.dispatchEvent(event);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Escape — cancel edit", () => {
    test("calls cancelEdit when editing cell", () => {
      const cancelEdit = mock();
      const params = defaults({
        editingCell: { row: 0, col: "name" },
        cancelEdit,
      });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("Escape"));

      expect(cancelEdit).toHaveBeenCalledTimes(1);
    });

    test("calls handleDiscardChanges when has pending changes (not editing, not editable target)", () => {
      const handleDiscardChanges = mock();
      const params = defaults({
        hasPendingChanges: true,
        handleDiscardChanges,
      });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("Escape"));

      expect(handleDiscardChanges).toHaveBeenCalledTimes(1);
    });

    test("does NOT discard when target is editable (e.g. input field)", () => {
      isEditableTargetMock.mockReturnValue(true);
      const handleDiscardChanges = mock();
      const params = defaults({
        hasPendingChanges: true,
        handleDiscardChanges,
      });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("Escape"));

      expect(handleDiscardChanges).not.toHaveBeenCalled();
    });

    test("does nothing when outside table, no editing, no pending changes", () => {
      const cancelEdit = mock();
      const handleDiscardChanges = mock();
      const params = defaults({
        cancelEdit,
        handleDiscardChanges,
      });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("Escape"));

      expect(cancelEdit).not.toHaveBeenCalled();
      expect(handleDiscardChanges).not.toHaveBeenCalled();
    });

    test("prevents default on escape when editing", () => {
      const params = defaults({
        editingCell: { row: 0, col: "name" },
      });

      renderHook(() => useTableHotkeys(params));

      const event = kb("Escape");
      const spy = mock();
      event.preventDefault = spy;
      window.dispatchEvent(event);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Cmd+F — open search", () => {
    test("opens search and focuses input", () => {
      const setIsSearchOpen = mock();
      const focusSearchInput = mock();
      const params = defaults({ setIsSearchOpen, focusSearchInput });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyF", { metaKey: true }));

      expect(setIsSearchOpen).toHaveBeenCalledWith(true);
      expect(focusSearchInput).toHaveBeenCalled();
    });

    test("does NOT open search when target is editable", () => {
      isEditableTargetMock.mockReturnValue(true);
      const setIsSearchOpen = mock();
      const params = defaults({ setIsSearchOpen });

      renderHook(() => useTableHotkeys(params));

      window.dispatchEvent(kb("KeyF", { metaKey: true }));

      expect(setIsSearchOpen).not.toHaveBeenCalled();
    });
  });
});
