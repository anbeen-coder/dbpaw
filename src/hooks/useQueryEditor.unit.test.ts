import { mock } from "bun:test";

const executeMock = mock();
const cancelMock = mock();
const listSchemasMock = mock();
const getSchemaOverviewMock = mock();
const listDatabasesMock = mock();

mock.module("@/services/api", () => ({
  api: {
    query: {
      execute: executeMock,
      cancel: cancelMock,
    },
    metadata: {
      listDatabasesById: listDatabasesMock,
      listSchemas: listSchemasMock,
      getSchemaOverview: getSchemaOverviewMock,
    },
    connections: {
      list: mock(),
    },
    queries: {
      create: mock(),
      update: mock(),
    },
  },
}));
mock.module("sonner", () => ({
  toast: { info: mock(), error: mock() },
}));

import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { useQueryEditor } from "./useQueryEditor";
import type { TabItem } from "@/types/tab";

const response = {
  data: [{ value: "stale" }],
  columns: [{ name: "value", type: "text" }],
  rowCount: 1,
  timeTakenMs: 20,
  success: true,
  execution: {
    queryId: "backend-id",
    originalSql: "SELECT pg_sleep(10)",
    executedSql: "SELECT pg_sleep(10) LIMIT 1000",
    defaultLimitApplied: true,
    defaultLimit: 1000,
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function initialTabs(): TabItem[] {
  return [
    {
      id: "tab-1",
      type: "editor",
      title: "Query (app)",
      connectionId: 7,
      database: "app",
      currentSchema: "public",
      driver: "postgres",
      documentRevision: 1,
      contextRevision: 0,
      queryResults: null,
    },
  ];
}

function useHarness() {
  const [tabs, setTabs] = useState<TabItem[]>(initialTabs);
  const editor = useQueryEditor({
    tabs,
    setTabs,
    setActiveTab: mock(),
    setQueriesLastUpdated: mock(),
    t: (key) => key,
  });
  return { tabs, ...editor };
}

beforeEach(() => {
  executeMock.mockReset();
  cancelMock.mockReset();
  listSchemasMock.mockReset();
  getSchemaOverviewMock.mockReset();
  listDatabasesMock.mockReset();
  cancelMock.mockResolvedValue(true);
  listSchemasMock.mockResolvedValue(["analytics"]);
  getSchemaOverviewMock.mockResolvedValue({
    tables: [],
    views: [],
  });
});

describe("useQueryEditor execution integration", () => {
  test("a context change prevents the old execution promise from writing results", async () => {
    const pending = deferred<typeof response>();
    executeMock.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useHarness());

    let executionPromise!: Promise<void>;
    await act(async () => {
      executionPromise = result.current.handleExecuteQuery("tab-1", {
        sql: "SELECT pg_sleep(10)",
        target: "document",
      });
      await Promise.resolve();
    });

    let tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.activeExecution?.status).toBe("running");

    await act(async () => {
      await result.current.handleEditorDatabaseChange("tab-1", "analytics");
    });

    tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.database).toBe("analytics");
    expect(tab.contextRevision).toBe(1);
    expect(tab.activeExecution).toBeUndefined();
    expect(cancelMock).toHaveBeenCalledWith(
      "7",
      expect.stringContaining("q-7-"),
    );

    await act(async () => {
      pending.resolve(response);
      await executionPromise;
    });

    tab = result.current.tabs[0];
    if (tab.type !== "editor") throw new Error("expected editor tab");
    expect(tab.contextRevision).toBe(1);
    expect(tab.queryResults).toBeNull();
    expect(tab.activeExecution).toBeUndefined();
  });
});
