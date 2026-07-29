import { mock } from "bun:test";

const executeMock = mock();
const cancelMock = mock();
const toastInfoMock = mock();
const toastErrorMock = mock();
mock.module("@/services/api", () => ({
  api: {
    query: {
      execute: executeMock,
      cancel: cancelMock,
    },
  },
}));
mock.module("sonner", () => ({
  toast: { info: toastInfoMock, error: toastErrorMock },
}));

import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { useSqlExecution } from "./useSqlExecution";
import type { TabItem } from "@/types/tab";

const response = {
  data: [{ value: 1 }],
  columns: [{ name: "value", type: "int" }],
  rowCount: 1,
  timeTakenMs: 12,
  success: true,
  execution: {
    queryId: "backend-id",
    originalSql: "SELECT 1",
    executedSql: "SELECT 1 LIMIT 1000",
    defaultLimitApplied: true,
    defaultLimit: 1000,
  },
};

function initialTabs(): TabItem[] {
  return [
    {
      id: "tab-1",
      type: "editor",
      title: "Query",
      connectionId: 7,
      database: "app",
      currentSchema: "public",
      driver: "postgres",
      documentRevision: 4,
      contextRevision: 2,
      queryResults: null,
    },
  ];
}

function useHarness(seedTabs: TabItem[] = initialTabs()) {
  const [tabs, setTabs] = useState<TabItem[]>(seedTabs);
  const execution = useSqlExecution({
    tabs,
    setTabs,
    t: (key) => key,
  });
  return { tabs, ...execution };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  executeMock.mockReset();
  cancelMock.mockReset();
  toastInfoMock.mockReset();
  toastErrorMock.mockReset();
});

describe("useSqlExecution", () => {
  test("creates a provenance snapshot and normalizes the backend response", async () => {
    executeMock.mockResolvedValue(response);
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.execute("tab-1", {
        sql: "SELECT 1",
        target: "selection",
        sourceRange: { from: 3, to: 11 },
      });
    });

    expect(executeMock).toHaveBeenCalledTimes(1);
    const call = executeMock.mock.calls[0];
    expect(call.slice(0, 4)).toEqual([7, "SELECT 1", "app", "sql_editor"]);
    expect(call[4]).toStartWith("q-7-");
    const tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.queryResults?.snapshot.target).toBe("selection");
    expect(tab.queryResults?.snapshot.sourceRange).toEqual({
      from: 3,
      to: 11,
    });
    expect(tab.queryResults?.snapshot.documentRevision).toBe(4);
    expect(tab.queryResults?.execution?.executedSql).toContain("LIMIT 1000");
  });

  test("prevents a second execution while the first is in flight", async () => {
    const pending = deferred<typeof response>();
    executeMock.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useHarness());

    let first!: Promise<void>;
    await act(async () => {
      first = result.current.execute("tab-1", {
        sql: "SELECT 1",
        target: "document",
      });
      await result.current.execute("tab-1", {
        sql: "SELECT 2",
        target: "document",
      });
    });
    expect(executeMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(response);
      await first;
    });
  });

  test("confirmed cancellation wins if the original promise settles later", async () => {
    const pending = deferred<typeof response>();
    executeMock.mockReturnValue(pending.promise);
    cancelMock.mockResolvedValue(true);
    const { result } = renderHook(() => useHarness());

    let executionPromise!: Promise<void>;
    await act(async () => {
      executionPromise = result.current.execute("tab-1", {
        sql: "SELECT pg_sleep(10)",
        target: "document",
      });
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.cancel("tab-1");
    });
    let tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.queryResults?.status).toBe("cancelled");

    await act(async () => {
      pending.resolve(response);
      await executionPromise;
    });
    tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.queryResults?.status).toBe("cancelled");
  });

  test("returns to running when the backend cannot cancel", async () => {
    const pending = deferred<typeof response>();
    executeMock.mockReturnValue(pending.promise);
    cancelMock.mockResolvedValue(false);
    const { result } = renderHook(() => useHarness());

    let executionPromise!: Promise<void>;
    await act(async () => {
      executionPromise = result.current.execute("tab-1", {
        sql: "SELECT pg_sleep(10)",
        target: "document",
      });
      await Promise.resolve();
    });
    await act(async () => {
      expect(await result.current.cancel("tab-1")).toBe(false);
    });
    let tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.activeExecution?.status).toBe("running");

    await act(async () => {
      pending.resolve(response);
      await executionPromise;
    });
    tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.queryResults?.status).toBe("success");
  });

  test("preserves structured backend errors", async () => {
    executeMock.mockRejectedValue({
      code: 2401,
      message: "syntax error near FROM",
      hint: "Check the selected columns",
      category: "query",
    });
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.execute("tab-1", {
        sql: "SELECT FROM",
        target: "document",
      });
    });

    const tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.queryResults?.status).toBe("error");
    expect(tab.queryResults?.error).toEqual({
      code: 2401,
      message: "syntax error near FROM",
      hint: "Check the selected columns",
      category: "query",
    });
  });

  test("rejects invalid tabs and tabs without a connection", async () => {
    const noConnectionTabs = initialTabs();
    const noConnectionTab = noConnectionTabs[0];
    if (noConnectionTab.type !== "editor") {
      throw new Error("expected editor tab");
    }
    noConnectionTab.connectionId = undefined;
    const { result } = renderHook(() => useHarness(noConnectionTabs));

    await act(async () => {
      await result.current.execute("missing-tab", {
        sql: "SELECT 1",
        target: "document",
      });
      await result.current.execute("tab-1", {
        sql: "SELECT 1",
        target: "document",
      });
    });

    expect(executeMock).not.toHaveBeenCalled();
    expect(toastInfoMock).toHaveBeenCalledTimes(2);
    expect(toastInfoMock).toHaveBeenNthCalledWith(
      1,
      "app.error.selectConnectionFirst",
    );
  });

  test("ignores empty SQL without starting an execution", async () => {
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.execute("tab-1", {
        sql: " \n\t ",
        target: "document",
      });
    });

    expect(executeMock).not.toHaveBeenCalled();
    expect(toastInfoMock).not.toHaveBeenCalled();
    const tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.activeExecution).toBeUndefined();
  });

  test("restores running state and reports cancellation API errors", async () => {
    const pending = deferred<typeof response>();
    executeMock.mockReturnValue(pending.promise);
    cancelMock.mockRejectedValue({
      code: 2501,
      message: "cancel transport failed",
      category: "network",
    });
    const { result } = renderHook(() => useHarness());

    let executionPromise!: Promise<void>;
    await act(async () => {
      executionPromise = result.current.execute("tab-1", {
        sql: "SELECT pg_sleep(10)",
        target: "document",
      });
      await Promise.resolve();
    });
    await act(async () => {
      expect(await result.current.cancel("tab-1")).toBe(false);
    });

    let tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.activeExecution?.status).toBe("running");
    expect(toastErrorMock).toHaveBeenCalledWith(
      "sqlEditor.result.cancelFailed",
      { description: "cancel transport failed" },
    );

    await act(async () => {
      pending.resolve(response);
      await executionPromise;
    });
    tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.queryResults?.status).toBe("success");
  });
});
