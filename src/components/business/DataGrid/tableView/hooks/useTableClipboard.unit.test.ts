import { mock } from "bun:test";

const toastSuccessMock = mock();
const toastErrorMock = mock();
mock.module("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useTableClipboard } from "./useTableClipboard";
import type { SelectedCell, TableContext, TableRow } from "../types";

const columns = ["id", "name", "email"];
const data: TableRow[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
  { id: 3, name: "Charlie", email: "charlie@example.com" },
];

const tableContext: TableContext = {
  connectionId: 1,
  database: "testdb",
  schema: "public",
  table: "users",
  driver: "mysql",
};

function getCellDisplayValue(
  _row: number,
  _col: string,
  originalValue: unknown,
) {
  return originalValue;
}

const t = ((key: string, params?: Record<string, unknown>) => {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
}) as Parameters<typeof useTableClipboard>[0]["t"];

function defaults(overrides: Record<string, unknown> = {}) {
  return {
    t,
    data,
    currentData: data,
    columns,
    tableContext,
    canUpdateDelete: true,
    primaryKeys: ["id"],
    isEditableForUpdates: true,
    selectedCellRef: { current: null as SelectedCell | null },
    cellSelectionRange: null as {
      anchor: { row: number; colIndex: number };
      tip: { row: number; colIndex: number };
    } | null,
    getCellDisplayValue,
    setPendingChanges: mock(),
    ...overrides,
  } as Parameters<typeof useTableClipboard>[0];
}

describe("useTableClipboard", () => {
  let originalClipboard: typeof navigator.clipboard;

  beforeEach(() => {
    toastSuccessMock.mockClear();
    toastErrorMock.mockClear();
    originalClipboard = navigator.clipboard;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  describe("handleCopy", () => {
    test("writes text to clipboard and shows success toast with label", async () => {
      const writeTextMock = mock(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTableClipboard(defaults()));

      act(() => {
        result.current.handleCopy("hello", "Copied!");
      });

      expect(writeTextMock).toHaveBeenCalledWith("hello");

      await act(async () => {
        await Promise.resolve();
      });

      expect(toastSuccessMock).toHaveBeenCalledWith("Copied!");
    });

    test("shows error toast when clipboard write fails", async () => {
      const writeTextMock = mock(() =>
        Promise.reject(new Error("Clipboard denied")),
      );
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTableClipboard(defaults()));

      act(() => {
        result.current.handleCopy("text");
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(toastErrorMock).toHaveBeenCalledWith(
        expect.stringContaining("copyFailed"),
        expect.objectContaining({
          description: "Clipboard denied",
        }),
      );
    });
  });

  describe("handleHeaderCopy", () => {
    test("copies column name to clipboard", async () => {
      const writeTextMock = mock(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTableClipboard(defaults()));

      act(() => {
        result.current.handleHeaderCopy("email");
      });

      expect(writeTextMock).toHaveBeenCalledWith("email");

      await act(async () => {
        await Promise.resolve();
      });

      expect(toastSuccessMock).toHaveBeenCalledWith(
        expect.stringContaining("email"),
      );
    });
  });

  describe("getSelectedCellCopyText", () => {
    test("returns cell value string when cell is selected", () => {
      const selectedCellRef = { current: { row: 0, col: "name" } as SelectedCell };
      const { result } = renderHook(() =>
        useTableClipboard(defaults({ selectedCellRef })),
      );

      expect(result.current.getSelectedCellCopyText()).toBe("Alice");
    });

    test("returns null when no cell is selected", () => {
      const { result } = renderHook(() => useTableClipboard(defaults()));

      expect(result.current.getSelectedCellCopyText()).toBeNull();
    });

    test("returns empty string for null cell value", () => {
      const nullData = [{ id: 1, name: null, email: "a@b.com" }];
      const selectedCellRef = { current: { row: 0, col: "name" } as SelectedCell };
      const { result } = renderHook(() =>
        useTableClipboard(
          defaults({ currentData: nullData, data: nullData, selectedCellRef }),
        ),
      );

      expect(result.current.getSelectedCellCopyText()).toBe("");
    });
  });

  describe("handleCopySelection", () => {
    test("copies single cell when no range is set", () => {
      const writeTextMock = mock(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const selectedCellRef = { current: { row: 1, col: "email" } as SelectedCell };
      const { result } = renderHook(() =>
        useTableClipboard(defaults({ selectedCellRef })),
      );

      act(() => {
        result.current.handleCopySelection();
      });

      expect(writeTextMock).toHaveBeenCalledWith("bob@example.com");
    });

    test("copies range as tab-separated values", () => {
      const writeTextMock = mock(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const cellSelectionRange = {
        anchor: { row: 0, colIndex: 0 },
        tip: { row: 1, colIndex: 1 },
      };
      const { result } = renderHook(() =>
        useTableClipboard(defaults({ cellSelectionRange })),
      );

      act(() => {
        result.current.handleCopySelection();
      });

      expect(writeTextMock).toHaveBeenCalledWith("1\tAlice\n2\tBob");
    });

    test("does nothing when no cell selected and no range", () => {
      const writeTextMock = mock(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTableClipboard(defaults()));

      act(() => {
        result.current.handleCopySelection();
      });

      expect(writeTextMock).not.toHaveBeenCalled();
    });
  });

  describe("handlePaste", () => {
    test("parses pasted tab-separated text into pending changes", () => {
      const setPendingChanges = mock();
      const selectedCellRef = { current: { row: 0, col: "name" } as SelectedCell };
      const { result } = renderHook(() =>
        useTableClipboard(defaults({ selectedCellRef, setPendingChanges })),
      );

      const clipboardData = {
        getData: (type: string) =>
          type === "text/plain" ? "NewAlice\tnew@email.com" : "",
      };
      const event = {
        preventDefault: mock(),
        clipboardData,
        target: document.createElement("div"),
      } as unknown as React.ClipboardEvent;

      act(() => {
        result.current.handlePaste(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(setPendingChanges).toHaveBeenCalled();

      const updater = setPendingChanges.mock.calls[0][0];
      const prev = new Map();
      const next = updater(prev);

      expect(next.get("0_name")).toEqual(
        expect.objectContaining({
          rowIndex: 0,
          column: "name",
          newValue: "NewAlice",
        }),
      );
      expect(next.get("0_email")).toEqual(
        expect.objectContaining({
          rowIndex: 0,
          column: "email",
          newValue: "new@email.com",
        }),
      );
    });

    test("does nothing when isEditableForUpdates is false", () => {
      const setPendingChanges = mock();
      const selectedCellRef = { current: { row: 0, col: "name" } as SelectedCell };
      const { result } = renderHook(() =>
        useTableClipboard(
          defaults({
            selectedCellRef,
            setPendingChanges,
            isEditableForUpdates: false,
          }),
        ),
      );

      const event = {
        preventDefault: mock(),
        clipboardData: { getData: () => "NewAlice" },
        target: document.createElement("div"),
      } as unknown as React.ClipboardEvent;

      act(() => {
        result.current.handlePaste(event);
      });

      expect(setPendingChanges).not.toHaveBeenCalled();
    });

    test("does nothing when target is INPUT element", () => {
      const setPendingChanges = mock();
      const selectedCellRef = { current: { row: 0, col: "name" } as SelectedCell };
      const { result } = renderHook(() =>
        useTableClipboard(defaults({ selectedCellRef, setPendingChanges })),
      );

      const input = document.createElement("input");
      const event = {
        preventDefault: mock(),
        clipboardData: { getData: () => "NewAlice" },
        target: input,
      } as unknown as React.ClipboardEvent;

      act(() => {
        result.current.handlePaste(event);
      });

      expect(setPendingChanges).not.toHaveBeenCalled();
    });

    test("does nothing when no cell is selected", () => {
      const setPendingChanges = mock();
      const { result } = renderHook(() =>
        useTableClipboard(defaults({ setPendingChanges })),
      );

      const event = {
        preventDefault: mock(),
        clipboardData: { getData: () => "NewAlice" },
        target: document.createElement("div"),
      } as unknown as React.ClipboardEvent;

      act(() => {
        result.current.handlePaste(event);
      });

      expect(setPendingChanges).not.toHaveBeenCalled();
    });

    test("handles multi-line paste (multiple rows)", () => {
      const setPendingChanges = mock();
      const selectedCellRef = { current: { row: 0, col: "id" } as SelectedCell };
      const { result } = renderHook(() =>
        useTableClipboard(defaults({ selectedCellRef, setPendingChanges })),
      );

      const event = {
        preventDefault: mock(),
        clipboardData: { getData: () => "10\tA1\ta1@x.com\n20\tB2\tb2@x.com" },
        target: document.createElement("div"),
      } as unknown as React.ClipboardEvent;

      act(() => {
        result.current.handlePaste(event);
      });

      const updater = setPendingChanges.mock.calls[0][0];
      const next = updater(new Map());

      expect(next.get("0_id")?.newValue).toBe("10");
      expect(next.get("1_id")?.newValue).toBe("20");
    });
  });
});
