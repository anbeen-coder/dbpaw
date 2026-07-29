import { mock } from "bun:test";

const mockT = (s: string) => s;
let tauriMode = false;
const saveDialogMock = mock(() => Promise.resolve<string | null>(null));
const exportMock = mock(() =>
  Promise.resolve({ rowCount: 10, filePath: "/tmp/test.csv" }),
);
mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

mock.module("sonner", () => ({
  toast: { success: mock(), error: mock() },
}));

mock.module("@/lib/errors", () => ({
  errorMessage: (e: unknown) => String(e),
}));

mock.module("@tauri-apps/plugin-dialog", () => ({
  save: saveDialogMock,
}));

mock.module("@/services/api", () => ({
  api: {
    queries: {
      create: mock(() => Promise.resolve({ id: 1, name: "test" })),
      update: mock(() => Promise.resolve({ id: 1, name: "test" })),
    },
    transfer: {
      exportQueryResult: exportMock,
    },
  },
  isTauri: () => tauriMode,
}));

import { beforeEach, describe, test, expect } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useSqlEditorApi } from "./useSqlEditorApi";

beforeEach(() => {
  tauriMode = false;
  saveDialogMock.mockReset();
  saveDialogMock.mockResolvedValue(null);
  exportMock.mockReset();
  exportMock.mockResolvedValue({
    rowCount: 10,
    filePath: "/tmp/test.csv",
  });
});

describe("useSqlEditorApi", () => {
  test("isFormatting defaults to false", () => {
    const { result } = renderHook(() => useSqlEditorApi({ code: "SELECT 1" }));
    expect(result.current.isFormatting).toBe(false);
  });

  test("isSaveDialogOpen defaults to false", () => {
    const { result } = renderHook(() => useSqlEditorApi({ code: "SELECT 1" }));
    expect(result.current.isSaveDialogOpen).toBe(false);
  });

  test("setIsSaveDialogOpen toggles dialog state", () => {
    const { result } = renderHook(() => useSqlEditorApi({ code: "SELECT 1" }));
    act(() => result.current.setIsSaveDialogOpen(true));
    expect(result.current.isSaveDialogOpen).toBe(true);
  });

  test("exports from the execution snapshot instead of current editor code", async () => {
    tauriMode = true;
    saveDialogMock.mockResolvedValue("/tmp/result.csv");
    const { result } = renderHook(() =>
      useSqlEditorApi({
        code: "SELECT changed_after_execution",
        connectionId: 999,
        databaseName: "changed_db",
        driver: "mysql",
      }),
    );

    await act(async () => {
      await result.current.handleExportResult(
        {
          snapshot: {
            executionId: "q-1",
            tabId: "tab-1",
            target: "selection",
            sql: "SELECT original",
            context: {
              connectionId: 7,
              database: "snapshot_db",
              schema: "public",
              driver: "postgres",
              contextRevision: 0,
            },
            documentRevision: 0,
            startedAt: 0,
          },
          status: "success",
          data: [],
          columns: [],
          rowCount: 0,
          executionTimeMs: 1,
          execution: {
            queryId: "q-1",
            originalSql: "SELECT original",
            executedSql: "SELECT original LIMIT 1000",
            defaultLimitApplied: true,
            defaultLimit: 1000,
          },
        },
        "csv",
      );
    });

    expect(exportMock).toHaveBeenCalledWith({
      id: 7,
      database: "snapshot_db",
      sql: "SELECT original LIMIT 1000",
      driver: "postgres",
      format: "csv",
      filePath: "/tmp/result.csv",
    });
  });
});
