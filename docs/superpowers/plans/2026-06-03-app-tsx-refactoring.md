# App.tsx 组件拆分实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 2518 行的 App.tsx 拆分为职责单一的自定义 hooks 和 UI 组件，提高可维护性，不改变任何功能。

**Architecture:** 采用混合方法 — 将状态管理逻辑提取到 5 个自定义 hooks，将 UI 渲染提取到 5 个组件。App.tsx 作为顶层容器协调 hooks 和组件之间的数据流。

**Tech Stack:** React 19, TypeScript 5, Vite 7, Tauri 2, shadcn/ui, @dnd-kit, lucide-react, sonner, i18next

---

## 文件结构

### 新建文件（hooks）
- `src/hooks/useTabManager.ts` — 标签页状态管理（tabs, activeTab, 拖拽排序, 循环切换）
- `src/hooks/useQueryEditor.ts` — SQL 编辑器逻辑（创建/执行/保存查询）
- `src/hooks/useTableViewer.ts` — 表格数据查看逻辑（分页/排序/过滤/刷新）
- `src/hooks/useUnsavedChanges.ts` — 未保存更改处理（关闭确认对话框流程）
- `src/hooks/useKeyboardShortcuts.ts` — 全局键盘快捷键

### 新建文件（components）
- `src/components/layout/AppLayout.tsx` — 整体布局（窗口拖动区域 + ResizablePanelGroup）
- `src/components/layout/TabBar.tsx` — 标签栏 UI（TabsList + 拖拽 + 右键菜单）
- `src/components/layout/TabContentRenderer.tsx` — 标签内容渲染器（根据类型分发）
- `src/components/layout/UnsavedChangesDialog.tsx` — 未保存更改确认对话框
- `src/components/layout/WindowActions.tsx` — 窗口操作按钮

### 修改文件
- `src/App.tsx` — 重构为使用新 hooks 和组件的轻量容器

### 新建文件（测试）
- `src/hooks/useTabManager.unit.test.ts`
- `src/hooks/useQueryEditor.unit.test.ts`
- `src/hooks/useTableViewer.unit.test.ts`
- `src/hooks/useUnsavedChanges.unit.test.ts`
- `src/hooks/useKeyboardShortcuts.unit.test.ts`

---

### Task 1: 创建 useTabManager Hook

**Files:**
- Create: `src/hooks/useTabManager.ts`
- Test: `src/hooks/useTabManager.unit.test.ts`

- [ ] **Step 1: 创建 hooks 目录**

```bash
mkdir -p src/hooks
```

- [ ] **Step 2: 创建 useTabManager.ts 基础结构**

```typescript
// src/hooks/useTabManager.ts
import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { TabItem } from "@/App";

export type SidebarLayoutMode = "tabs" | "tree";

export function useTabManager() {
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");

  const revealSidebarForTab = useCallback(
    (tabId: string, sourceTabs = tabs) => {
      // 这个函数需要外部注入，因为它依赖 sidebarRevealRequest 状态
      // 在实际使用时通过参数传入
    },
    [tabs],
  );

  const handleMainTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      // revealSidebarForTab 需要外部注入
    },
    [],
  );

  const closeTabNow = useCallback(
    (tabId: string, onRevealSidebar?: (tabId: string, tabs: TabItem[]) => void) => {
      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        setActiveTab((currentActiveTab) => {
          if (currentActiveTab !== tabId) return currentActiveTab;
          const nextActiveTab = newTabs[newTabs.length - 1]?.id || "";
          if (nextActiveTab && onRevealSidebar) {
            onRevealSidebar(nextActiveTab, newTabs);
          }
          return nextActiveTab;
        });
        return newTabs;
      });
    },
    [],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTabs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleCycleTabs = useCallback(
    (direction: 1 | -1) => {
      if (tabs.length < 2) return;
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (startIndex + direction + tabs.length) % tabs.length;
      const nextTabId = tabs[nextIndex].id;
      setActiveTab(nextTabId);
    },
    [tabs, activeTab],
  );

  return {
    tabs,
    setTabs,
    activeTab,
    setActiveTab,
    handleMainTabChange,
    closeTabNow,
    handleDragEnd,
    handleCycleTabs,
  };
}
```

- [ ] **Step 3: 创建 useTabManager.unit.test.ts**

```typescript
// src/hooks/useTabManager.unit.test.ts
import { describe, it, expect } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useTabManager } from "./useTabManager";

describe("useTabManager", () => {
  it("初始状态应为空标签和空活动标签", () => {
    const { result } = renderHook(() => useTabManager());
    expect(result.current.tabs).toEqual([]);
    expect(result.current.activeTab).toBe("");
  });

  it("setTabs 应正确更新标签列表", () => {
    const { result } = renderHook(() => useTabManager());
    const mockTab = {
      id: "test-1",
      type: "editor" as const,
      title: "Test Tab",
    };
    act(() => {
      result.current.setTabs([mockTab]);
    });
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].id).toBe("test-1");
  });

  it("setActiveTab 应正确更新活动标签", () => {
    const { result } = renderHook(() => useTabManager());
    act(() => {
      result.current.setActiveTab("test-1");
    });
    expect(result.current.activeTab).toBe("test-1");
  });

  it("handleCycleTabs 应在标签间循环切换", () => {
    const { result } = renderHook(() => useTabManager());
    const tabs = [
      { id: "tab-1", type: "editor" as const, title: "Tab 1" },
      { id: "tab-2", type: "editor" as const, title: "Tab 2" },
      { id: "tab-3", type: "editor" as const, title: "Tab 3" },
    ];
    act(() => {
      result.current.setTabs(tabs);
      result.current.setActiveTab("tab-1");
    });
    act(() => {
      result.current.handleCycleTabs(1);
    });
    expect(result.current.activeTab).toBe("tab-2");
    act(() => {
      result.current.handleCycleTabs(1);
    });
    expect(result.current.activeTab).toBe("tab-3");
    act(() => {
      result.current.handleCycleTabs(1);
    });
    expect(result.current.activeTab).toBe("tab-1");
  });

  it("closeTabNow 应关闭标签并切换到上一个标签", () => {
    const { result } = renderHook(() => useTabManager());
    const tabs = [
      { id: "tab-1", type: "editor" as const, title: "Tab 1" },
      { id: "tab-2", type: "editor" as const, title: "Tab 2" },
    ];
    act(() => {
      result.current.setTabs(tabs);
      result.current.setActiveTab("tab-2");
    });
    act(() => {
      result.current.closeTabNow("tab-2");
    });
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].id).toBe("tab-1");
    expect(result.current.activeTab).toBe("tab-1");
  });
});
```

- [ ] **Step 4: 运行测试验证通过**

```bash
bun test src/hooks/useTabManager.unit.test.ts
```

- [ ] **Step 5: 提交**

```bash
git add src/hooks/useTabManager.ts src/hooks/useTabManager.unit.test.ts
git commit -m "refactor: add useTabManager hook for tab state management"
```

---

### Task 2: 创建 useQueryEditor Hook

**Files:**
- Create: `src/hooks/useQueryEditor.ts`
- Test: `src/hooks/useQueryEditor.unit.test.ts`

- [ ] **Step 1: 创建 useQueryEditor.ts**

```typescript
// src/hooks/useQueryEditor.ts
import { useCallback, useRef } from "react";
import { api, type SavedQuery, type SchemaOverview } from "@/services/api";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { isKeyValueDriver } from "@/lib/driver-registry";
import { applyQueryCompletionToTab } from "@/lib/queryExecutionState";
import {
  normalizeDatabaseOptions,
  resolvePreferredDatabase,
} from "@/lib/sqlEditorDatabase";
import type { TabItem } from "@/App";

interface UseQueryEditorParams {
  tabs: TabItem[];
  setTabs: React.Dispatch<React.SetStateAction<TabItem[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  setQueriesLastUpdated: React.Dispatch<React.SetStateAction<number>>;
  t: (key: string, options?: any) => string;
}

export function useQueryEditor({
  tabs,
  setTabs,
  setActiveTab,
  setQueriesLastUpdated,
  t,
}: UseQueryEditorParams) {
  const fetchEditorDatabases = useCallback(
    async (connectionId: number, fallbackDatabase?: string) => {
      const databases = await api.metadata.listDatabasesById(connectionId);
      return normalizeDatabaseOptions(databases, fallbackDatabase);
    },
    [],
  );

  const fetchEditorSchemaOverview = useCallback(
    async (connectionId: number, database?: string) => {
      return api.metadata.getSchemaOverview(connectionId, database);
    },
    [],
  );

  const resolveTableScope = useCallback(
    (driver: string, database?: string, schemaOverride?: string) => {
      const isDatabaseScoped =
        (driver && isMysqlFamilyDriver(driver as any)) || driver === "clickhouse";
      const normalizedSchemaOverride = (schemaOverride || "").trim();
      return {
        schema: isDatabaseScoped
          ? database || ""
          : normalizedSchemaOverride ||
            (driver === "mssql"
              ? "dbo"
              : driver === "sqlite" || driver === "duckdb"
                ? "main"
                : "public"),
        dbParam: isDatabaseScoped ? undefined : database,
      };
    },
    [],
  );

  const handleCreateQuery = useCallback(
    (connectionId: number, databaseName: string, driver: string) => {
      if (isKeyValueDriver(driver as any)) {
        toast.info(t("app.error.redisNoSql"));
        return;
      }
      if (driver === "elasticsearch") {
        toast.info(t("app.error.elasticsearchNoSql"));
        return;
      }
      const normalizedDatabaseName = databaseName.trim();
      const fallbackDatabaseLabel = t("app.tab.defaultDatabase");
      const initialDatabase = normalizedDatabaseName || undefined;
      const titleDatabase = normalizedDatabaseName || fallbackDatabaseLabel;
      const newTabId = `query-${connectionId}-${titleDatabase}-${Date.now()}`;
      const newTab: TabItem = {
        id: newTabId,
        type: "editor",
        title: t("app.tab.queryTitle", { database: titleDatabase }),
        connectionId,
        database: initialDatabase,
        driver,
        availableDatabases: normalizeDatabaseOptions(
          initialDatabase ? [initialDatabase] : [],
          initialDatabase,
        ),
        sqlContent: "",
        lastSavedSql: "",
        isDirty: false,
        queryResults: null,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTab(newTabId);

      Promise.allSettled([
        fetchEditorDatabases(connectionId, initialDatabase),
        fetchEditorSchemaOverview(connectionId, initialDatabase),
      ]).then(([availableDatabasesResult, schemaOverviewResult]) => {
        if (availableDatabasesResult.status === "rejected") {
          console.error(
            "Failed to load editor databases:",
            errorMessage(availableDatabasesResult.reason),
          );
        }
        if (schemaOverviewResult.status === "rejected") {
          console.error(
            "Failed to load schema overview:",
            errorMessage(schemaOverviewResult.reason),
          );
        }

        const availableDatabases =
          availableDatabasesResult.status === "fulfilled"
            ? availableDatabasesResult.value
            : normalizeDatabaseOptions(
                initialDatabase ? [initialDatabase] : [],
                initialDatabase,
              );
        const schemaOverview =
          schemaOverviewResult.status === "fulfilled"
            ? schemaOverviewResult.value
            : undefined;

        setTabs((prev) =>
          prev.map((t) =>
            t.id === newTabId
              ? {
                  ...t,
                  database: resolvePreferredDatabase({
                    preferredDatabase: initialDatabase,
                    connectionDatabase: initialDatabase,
                    availableDatabases,
                  }),
                  availableDatabases,
                  schemaOverview,
                }
              : t,
          ),
        );
      });
    },
    [fetchEditorDatabases, fetchEditorSchemaOverview, setTabs, setActiveTab, t],
  );

  const handleSqlChange = useCallback(
    (tabId: string, sql: string) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          return {
            ...t,
            sqlContent: sql,
            isDirty: sql !== (t.lastSavedSql ?? ""),
          };
        }),
      );
    },
    [setTabs],
  );

  const handleExecuteQuery = useCallback(
    async (tabId: string, sql: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.connectionId) {
        alert(t("app.error.selectConnectionFirst"));
        return;
      }

      const start = performance.now();
      const queryId = `q-${tab.connectionId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? { ...t, activeQueryId: queryId, lastQueryId: queryId }
            : t,
        ),
      );
      try {
        const result = await api.query.execute(
          tab.connectionId,
          sql,
          tab.database,
          "sql_editor",
          queryId,
        );
        const columns = (result.columns || []).map((c) => c.name);
        const execMs = Math.round(
          result.timeTakenMs ?? performance.now() - start,
        );

        const resultSets = result.resultSets?.map((rs) => ({
          data: rs.data,
          columns: rs.columns.map((c) => c.name),
          rowCount: rs.rowCount,
          statement: rs.statement,
          index: rs.index,
        }));

        setTabs((prev) =>
          prev.map((t) =>
            applyQueryCompletionToTab(t, tabId, queryId, {
              data: result.data || [],
              columns,
              executionTime: `${execMs}ms`,
              resultSets,
              activeResultSetIndex: resultSets?.length ? 0 : undefined,
            }),
          ),
        );
      } catch (e) {
        const message = errorMessage(e);
        console.error("execute_query failed:", message);
        setTabs((prev) =>
          prev.map((t) =>
            applyQueryCompletionToTab(t, tabId, queryId, {
              data: [],
              columns: [],
              executionTime: "0ms",
              error: message,
            }),
          ),
        );
      }
    },
    [tabs, setTabs, t],
  );

  const saveEditorTab = useCallback(
    async (tab: TabItem, name: string, description: string) => {
      if (tab.type !== "editor") return;

      try {
        const query = tab.sqlContent || "";
        const payload = {
          name,
          description,
          query,
          connectionId: tab.connectionId || undefined,
          database: tab.database,
        };

        const savedQuery = tab.savedQueryId
          ? await api.queries.update(tab.savedQueryId, payload)
          : await api.queries.create(payload);

        setQueriesLastUpdated(Date.now());
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tab.id
              ? {
                  ...t,
                  savedQueryId: savedQuery.id,
                  title: savedQuery.name,
                  savedQueryDescription: savedQuery.description || undefined,
                  sqlContent: savedQuery.query,
                  lastSavedSql: savedQuery.query,
                  isDirty: false,
                }
              : t,
          ),
        );
      } catch (e) {
        toast.error(t("app.error.saveQuery"), {
          description: errorMessage(e),
        });
        throw e;
      }
    },
    [setTabs, setQueriesLastUpdated, t],
  );

  return {
    handleCreateQuery,
    handleSqlChange,
    handleExecuteQuery,
    saveEditorTab,
    fetchEditorDatabases,
    fetchEditorSchemaOverview,
    resolveTableScope,
  };
}
```

- [ ] **Step 2: 运行 lint 验证**

```bash
npx tsc --noEmit src/hooks/useQueryEditor.ts
```

- [ ] **Step 3: 提交**

```bash
git add src/hooks/useQueryEditor.ts
git commit -m "refactor: add useQueryEditor hook for SQL editor logic"
```

---

### Task 3: 创建 useTableViewer Hook

**Files:**
- Create: `src/hooks/useTableViewer.ts`

- [ ] **Step 1: 创建 useTableViewer.ts**

```typescript
// src/hooks/useTableViewer.ts
import { useCallback } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { isMysqlFamilyDriver } from "@/lib/driver-registry";
import type { TabItem } from "@/App";

type TableRefreshOverrides = {
  page?: number;
  limit?: number;
  filter?: string;
  orderBy?: string;
};

interface UseTableViewerParams {
  tabs: TabItem[];
  setTabs: React.Dispatch<React.SetStateAction<TabItem[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  resolveTableScope: (driver: string, database?: string, schemaOverride?: string) => {
    schema: string;
    dbParam: string | undefined;
  };
  t: (key: string, options?: any) => string;
}

export function useTableViewer({
  tabs,
  setTabs,
  setActiveTab,
  resolveTableScope,
  t,
}: UseTableViewerParams) {
  const handleTableSelect = useCallback(
    async (
      connection: string,
      database: string,
      table: string,
      connectionId: number,
      driver: string,
      schemaName?: string,
    ) => {
      const tabId = `${connection}-${database}-${schemaName || ""}-${table}`;
      const existingTab = tabs.find((t) => t.id === tabId);
      if (existingTab) {
        setActiveTab(tabId);
        return;
      }

      setTabs((prev) => [
        ...prev,
        {
          id: tabId,
          type: "table" as const,
          title: table,
          connection,
          database,
          connectionId,
          driver,
          isLoading: true,
        },
      ]);
      setActiveTab(tabId);

      try {
        const { schema, dbParam } = resolveTableScope(driver, database, schemaName);

        const resp = await api.tableData.get({
          id: connectionId,
          database: dbParam,
          schema,
          table,
          page: 1,
          limit: 100,
        });
        let columns: string[] = [];
        try {
          const meta = await api.metadata.getTableMetadata(
            connectionId,
            database,
            schema,
            table,
          );
          if (meta && meta.columns) {
            columns = meta.columns.map((c) => c.name);
          }
        } catch (e) {
          console.warn("Failed to fetch metadata for table columns:", e);
        }

        if (columns.length === 0) {
          columns = resp.data.length > 0 ? Object.keys(resp.data[0]) : [];
        }

        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  isLoading: false,
                  schema,
                  tableName: table,
                  data: resp.data,
                  columns,
                  total: resp.total,
                  page: resp.page,
                  pageSize: resp.limit,
                  executionTimeMs: resp.executionTimeMs,
                }
              : t,
          ),
        );
      } catch (e) {
        const message = errorMessage(e);
        console.error("get_table_data failed", message);
        setTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, isLoading: false } : t)),
        );
        toast.error(t("app.error.loadTableData"), {
          description: message,
        });
      }
    },
    [tabs, setTabs, setActiveTab, resolveTableScope, t],
  );

  const handleTableRefresh = useCallback(
    async (tabId: string, overrides?: TableRefreshOverrides) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.connectionId || !tab.driver || !tab.tableName) return;

      const hasOwn = <K extends keyof TableRefreshOverrides>(key: K) =>
        !!overrides && Object.prototype.hasOwnProperty.call(overrides, key);

      const nextPage = overrides?.page ?? tab.page ?? 1;
      const nextLimit = overrides?.limit ?? tab.pageSize ?? 100;
      const nextFilter = hasOwn("filter") ? overrides?.filter : tab.filter;
      const nextOrderBy = hasOwn("orderBy") ? overrides?.orderBy : tab.orderBy;

      try {
        const { schema, dbParam } = resolveTableScope(tab.driver, tab.database, tab.schema);
        const resp = await api.tableData.get({
          id: tab.connectionId,
          database: dbParam,
          schema,
          table: tab.tableName,
          page: nextPage,
          limit: nextLimit,
          filter: nextFilter || undefined,
          sortColumn: tab.sortColumn,
          sortDirection: tab.sortDirection,
          orderBy: nextOrderBy || undefined,
        });

        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            return {
              ...t,
              data: resp.data,
              total: resp.total,
              page: resp.page,
              pageSize: resp.limit,
              executionTimeMs: resp.executionTimeMs,
              filter: nextFilter,
              orderBy: nextOrderBy,
            };
          }),
        );
      } catch (e) {
        const message = errorMessage(e);
        console.error("handleTableRefresh failed", message);
        toast.error(t("app.error.refreshTable"), {
          description: message,
        });
      }
    },
    [tabs, setTabs, resolveTableScope, t],
  );

  const handlePageChange = useCallback(
    async (tabId: string, page: number) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.connectionId || !tab.driver || !tab.tableName) return;

      try {
        const { schema, dbParam } = resolveTableScope(tab.driver, tab.database, tab.schema);
        const resp = await api.tableData.get({
          id: tab.connectionId,
          database: dbParam,
          schema,
          table: tab.tableName,
          page,
          limit: tab.pageSize || 100,
          filter: tab.filter,
          sortColumn: tab.sortColumn,
          sortDirection: tab.sortDirection,
          orderBy: tab.orderBy,
        });

        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            return {
              ...t,
              data: resp.data,
              total: resp.total,
              page: resp.page,
              executionTimeMs: resp.executionTimeMs,
            };
          }),
        );
      } catch (e) {
        const message = errorMessage(e);
        console.error("handlePageChange failed", message);
        toast.error(t("app.error.changePage"), {
          description: message,
        });
      }
    },
    [tabs, setTabs, resolveTableScope, t],
  );

  const handlePageSizeChange = useCallback(
    async (tabId: string, pageSize: number) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.connectionId || !tab.driver || !tab.tableName) return;

      try {
        const { schema, dbParam } = resolveTableScope(tab.driver, tab.database, tab.schema);
        const resp = await api.tableData.get({
          id: tab.connectionId,
          database: dbParam,
          schema,
          table: tab.tableName,
          page: 1,
          limit: pageSize,
          filter: tab.filter,
          sortColumn: tab.sortColumn,
          sortDirection: tab.sortDirection,
          orderBy: tab.orderBy,
        });

        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            return {
              ...t,
              data: resp.data,
              total: resp.total,
              page: resp.page,
              pageSize: resp.limit,
              executionTimeMs: resp.executionTimeMs,
            };
          }),
        );
      } catch (e) {
        const message = errorMessage(e);
        console.error("handlePageSizeChange failed", message);
        toast.error(t("app.error.changePageSize"), {
          description: message,
        });
      }
    },
    [tabs, setTabs, resolveTableScope, t],
  );

  const handleSortChange = useCallback(
    async (tabId: string, column: string, direction: "asc" | "desc") => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.connectionId || !tab.driver || !tab.tableName) return;

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          return { ...t, sortColumn: column, sortDirection: direction };
        }),
      );

      try {
        const { schema, dbParam } = resolveTableScope(tab.driver, tab.database, tab.schema);
        const resp = await api.tableData.get({
          id: tab.connectionId,
          database: dbParam,
          schema,
          table: tab.tableName,
          page: 1,
          limit: tab.pageSize || 100,
          filter: tab.filter,
          sortColumn: column,
          sortDirection: direction,
          orderBy: tab.orderBy,
        });

        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            return {
              ...t,
              data: resp.data,
              total: resp.total,
              page: resp.page,
              executionTimeMs: resp.executionTimeMs,
              sortColumn: column,
              sortDirection: direction,
            };
          }),
        );
      } catch (e) {
        const message = errorMessage(e);
        console.error("handleSortChange failed", message);
        toast.error(t("app.error.sortTable"), {
          description: message,
        });
      }
    },
    [tabs, setTabs, resolveTableScope, t],
  );

  const handleFilterChange = useCallback(
    async (tabId: string, filter: string, orderBy: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.connectionId || !tab.driver || !tab.tableName) return;

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          return { ...t, filter, orderBy };
        }),
      );

      try {
        const { schema, dbParam } = resolveTableScope(tab.driver, tab.database, tab.schema);
        const resp = await api.tableData.get({
          id: tab.connectionId,
          database: dbParam,
          schema,
          table: tab.tableName,
          page: 1,
          limit: tab.pageSize || 100,
          filter: filter || undefined,
          sortColumn: tab.sortColumn,
          sortDirection: tab.sortDirection,
          orderBy: orderBy || undefined,
        });

        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            return {
              ...t,
              data: resp.data,
              columns: t.columns,
              total: resp.total,
              page: resp.page,
              executionTimeMs: resp.executionTimeMs,
              filter,
              orderBy,
            };
          }),
        );
      } catch (e) {
        const message = errorMessage(e);
        console.error("handleFilterChange failed", message);
        toast.error(t("app.error.filterTable"), {
          description: message,
        });
      }
    },
    [tabs, setTabs, resolveTableScope, t],
  );

  return {
    handleTableSelect,
    handleTableRefresh,
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleFilterChange,
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hooks/useTableViewer.ts
git commit -m "refactor: add useTableViewer hook for table data operations"
```

---

### Task 4: 创建 useUnsavedChanges Hook

**Files:**
- Create: `src/hooks/useUnsavedChanges.ts`
- Test: `src/hooks/useUnsavedChanges.unit.test.ts`

- [ ] **Step 1: 创建 useUnsavedChanges.ts**

```typescript
// src/hooks/useUnsavedChanges.ts
import { useState, useCallback, useRef } from "react";
import type { TabItem } from "@/App";

interface UseUnsavedChangesParams {
  tabs: TabItem[];
  closeTabNow: (tabId: string) => void;
  saveEditorTab: (tab: TabItem, name: string, description: string) => Promise<void>;
}

export function useUnsavedChanges({
  tabs,
  closeTabNow,
  saveEditorTab,
}: UseUnsavedChangesParams) {
  const [pendingCloseTabIds, setPendingCloseTabIds] = useState<string[]>([]);
  const [currentCloseTabId, setCurrentCloseTabId] = useState<string | null>(null);
  const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
  const [isCloseSaveDialogOpen, setIsCloseSaveDialogOpen] = useState(false);
  const closeSaveCompletedRef = useRef(false);
  const unsavedConfirmActionRef = useRef<"save" | "discard" | null>(null);

  const resetCloseFlow = useCallback(() => {
    setPendingCloseTabIds([]);
    setCurrentCloseTabId(null);
    setIsUnsavedConfirmOpen(false);
    setIsCloseSaveDialogOpen(false);
    closeSaveCompletedRef.current = false;
    unsavedConfirmActionRef.current = null;
  }, []);

  const continueCloseFlow = useCallback(
    (queue: string[]) => {
      if (queue.length === 0) {
        resetCloseFlow();
        return;
      }

      const [nextTabId, ...rest] = queue;
      const nextTab = tabs.find((t) => t.id === nextTabId);
      if (!nextTab) {
        continueCloseFlow(rest);
        return;
      }

      if (nextTab.type === "editor" && nextTab.isDirty) {
        setPendingCloseTabIds(queue);
        setCurrentCloseTabId(nextTabId);
        setIsUnsavedConfirmOpen(true);
        setIsCloseSaveDialogOpen(false);
        return;
      }

      closeTabNow(nextTabId);
      continueCloseFlow(rest);
    },
    [tabs, closeTabNow, resetCloseFlow],
  );

  const requestCloseTabs = useCallback(
    (tabIds: string[]) => {
      const existingTabIds = tabIds.filter((id) =>
        tabs.some((t) => t.id === id),
      );
      if (existingTabIds.length === 0) return;
      continueCloseFlow(existingTabIds);
    },
    [tabs, continueCloseFlow],
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      requestCloseTabs([tabId]);
    },
    [requestCloseTabs],
  );

  const handleCloseOtherTabs = useCallback(
    (tabId: string) => {
      requestCloseTabs(tabs.filter((t) => t.id !== tabId).map((t) => t.id));
    },
    [requestCloseTabs, tabs],
  );

  const handleUnsavedCloseCancel = useCallback(() => {
    resetCloseFlow();
  }, [resetCloseFlow]);

  const handleUnsavedCloseWithoutSave = useCallback(() => {
    unsavedConfirmActionRef.current = "discard";
    if (!currentCloseTabId) {
      resetCloseFlow();
      return;
    }

    closeTabNow(currentCloseTabId);
    const currentIndex = pendingCloseTabIds.indexOf(currentCloseTabId);
    const rest =
      currentIndex >= 0
        ? pendingCloseTabIds.slice(currentIndex + 1)
        : pendingCloseTabIds.filter((id) => id !== currentCloseTabId);
    continueCloseFlow(rest);
  }, [
    closeTabNow,
    continueCloseFlow,
    currentCloseTabId,
    pendingCloseTabIds,
    resetCloseFlow,
  ]);

  const handleUnsavedCloseSave = useCallback(() => {
    unsavedConfirmActionRef.current = "save";
    setIsUnsavedConfirmOpen(false);
    setIsCloseSaveDialogOpen(true);
  }, []);

  const handleCloseSaveDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsCloseSaveDialogOpen(open);
      if (open) return;
      if (closeSaveCompletedRef.current) {
        closeSaveCompletedRef.current = false;
        return;
      }
      resetCloseFlow();
    },
    [resetCloseFlow],
  );

  const handleCloseFlowSave = useCallback(
    async (name: string, description: string) => {
      if (!currentCloseTabId) {
        resetCloseFlow();
        return;
      }

      const currentTab = tabs.find((t) => t.id === currentCloseTabId);
      if (!currentTab || currentTab.type !== "editor") {
        closeSaveCompletedRef.current = true;
        const currentIndex = pendingCloseTabIds.indexOf(currentCloseTabId);
        const rest =
          currentIndex >= 0
            ? pendingCloseTabIds.slice(currentIndex + 1)
            : pendingCloseTabIds.filter((id) => id !== currentCloseTabId);
        continueCloseFlow(rest);
        return;
      }

      await saveEditorTab(currentTab, name, description);

      closeSaveCompletedRef.current = true;
      closeTabNow(currentCloseTabId);
      const currentIndex = pendingCloseTabIds.indexOf(currentCloseTabId);
      const rest =
        currentIndex >= 0
          ? pendingCloseTabIds.slice(currentIndex + 1)
          : pendingCloseTabIds.filter((id) => id !== currentCloseTabId);
      continueCloseFlow(rest);
    },
    [
      closeTabNow,
      continueCloseFlow,
      currentCloseTabId,
      pendingCloseTabIds,
      resetCloseFlow,
      saveEditorTab,
      tabs,
    ],
  );

  const currentCloseTab = currentCloseTabId
    ? tabs.find((t) => t.id === currentCloseTabId)
    : undefined;

  return {
    pendingCloseTabIds,
    currentCloseTabId,
    isUnsavedConfirmOpen,
    isCloseSaveDialogOpen,
    currentCloseTab,
    requestCloseTabs,
    handleCloseTab,
    handleCloseOtherTabs,
    handleUnsavedCloseCancel,
    handleUnsavedCloseWithoutSave,
    handleUnsavedCloseSave,
    handleCloseSaveDialogOpenChange,
    handleCloseFlowSave,
    setIsUnsavedConfirmOpen,
    resetCloseFlow,
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hooks/useUnsavedChanges.ts
git commit -m "refactor: add useUnsavedChanges hook for unsaved changes flow"
```

---

### Task 5: 创建 useKeyboardShortcuts Hook

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: 创建 useKeyboardShortcuts.ts**

```typescript
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from "react";
import { isModKey, shouldIgnoreGlobalShortcut } from "@/lib/keyboard";
import { useShortcutMatcher } from "@/contexts/ShortcutsContext";
import type { TabItem } from "@/App";

interface UseKeyboardShortcutsParams {
  tabs: TabItem[];
  activeTab: string;
  handleCycleTabs: (direction: 1 | -1) => void;
  handleCloseTab: (tabId: string) => void;
  handleCreateQuery: (connectionId: number, database: string, driver: string) => void;
  setAiVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenSettings: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useKeyboardShortcuts({
  tabs,
  activeTab,
  handleCycleTabs,
  handleCloseTab,
  handleCreateQuery,
  setAiVisible,
  setOpenSettings,
}: UseKeyboardShortcutsParams) {
  const match = useShortcutMatcher();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isModKey(e) || shouldIgnoreGlobalShortcut(e)) return;

      if (match(e, "global.nextTab")) {
        e.preventDefault();
        handleCycleTabs(1);
        return;
      }

      if (match(e, "global.prevTab")) {
        e.preventDefault();
        handleCycleTabs(-1);
        return;
      }

      if (match(e, "global.closeTab")) {
        e.preventDefault();
        if (activeTab) {
          handleCloseTab(activeTab);
        }
        return;
      }

      if (match(e, "global.newQueryTab")) {
        e.preventDefault();
        const currentTab = tabs.find((t) => t.id === activeTab);
        if (
          currentTab &&
          currentTab.connectionId &&
          currentTab.database &&
          currentTab.driver
        ) {
          handleCreateQuery(
            currentTab.connectionId,
            currentTab.database,
            currentTab.driver,
          );
        }
        return;
      }

      if (match(e, "global.toggleAiSidebar")) {
        e.preventDefault();
        setAiVisible((v) => !v);
        return;
      }

      if (match(e, "global.openSettings")) {
        e.preventDefault();
        setOpenSettings(true);
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [activeTab, tabs, match, handleCycleTabs, handleCloseTab, handleCreateQuery, setAiVisible, setOpenSettings]);
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hooks/useKeyboardShortcuts.ts
git commit -m "refactor: add useKeyboardShortcuts hook for global shortcuts"
```

---

### Task 6: 创建 WindowActions 组件

**Files:**
- Create: `src/components/layout/WindowActions.tsx`

- [ ] **Step 1: 创建 WindowActions.tsx**

```typescript
// src/components/layout/WindowActions.tsx
import { Button } from "@/components/ui/button";
import { Settings, Sparkles } from "lucide-react";
import { SqlExecutionLogsDropdown } from "@/components/business/SqlLogs/SqlExecutionLogsDialog";
import { useTranslation } from "react-i18next";

interface WindowActionsProps {
  aiVisible: boolean;
  onToggleAi: () => void;
  onOpenSettings: () => void;
}

export function WindowActions({
  aiVisible,
  onToggleAi,
  onOpenSettings,
}: WindowActionsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onOpenSettings}
        title={t("app.window.settingsTooltip")}
        aria-label={t("app.window.openSettings")}
      >
        <Settings className="w-4 h-4" />
      </Button>
      <SqlExecutionLogsDropdown />
      <Button
        variant={aiVisible ? "default" : "ghost"}
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onToggleAi}
        title={
          aiVisible ? t("app.window.hideAiPanel") : t("app.window.showAiPanel")
        }
        aria-label={
          aiVisible
            ? t("app.window.hideAiPanelAria")
            : t("app.window.showAiPanelAria")
        }
      >
        <Sparkles className="w-4 h-4" />
      </Button>
    </>
  );
}
```

- [ ] **Step 2: 创建 layout 目录**

```bash
mkdir -p src/components/layout
```

- [ ] **Step 3: 提交**

```bash
git add src/components/layout/WindowActions.tsx
git commit -m "refactor: add WindowActions component for window action buttons"
```

---

### Task 7: 创建 TabBar 组件

**Files:**
- Create: `src/components/layout/TabBar.tsx`

- [ ] **Step 1: 创建 TabBar.tsx**

```typescript
// src/components/layout/TabBar.tsx
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, FileSearch, KeyRound, LayoutDashboard, Server, Table, X } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTab } from "@/components/ui/sortable-tab";
import { useTranslation } from "react-i18next";
import type { TabItem } from "@/App";

const TAB_TRIGGER_CLASS =
  "gap-2 group relative pr-8 bg-transparent data-[state=active]:bg-background border-b-2 border-b-transparent data-[state=active]:border-b-accent rounded-none h-9 hover:bg-muted/50 border-r border-r-border/40 last:border-r-0 shrink-0";

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  tableTabTitleCounts: Map<string, number>;
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  onDragEnd,
  onCloseTab,
  onCloseOtherTabs,
  tableTabTitleCounts,
}: TabBarProps) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  return (
    <TabsList className="h-9 min-w-0 w-full justify-start gap-0 bg-transparent border-none p-0 overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={tabs.map((t) => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          {tabs.map((tab) => {
            const title =
              tab.type === "table" &&
              (tableTabTitleCounts.get(tab.title) || 0) > 1 &&
              tab.database
                ? `${tab.database}.${tab.title}`
                : tab.title;
            return (
              <SortableTab key={tab.id} id={tab.id}>
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <span className="contents">
                      <TabsTrigger
                        value={tab.id}
                        className={TAB_TRIGGER_CLASS}
                        asChild
                        onMouseDown={(e) => {
                          if (e.button === 1) {
                            e.preventDefault();
                            onCloseTab(tab.id);
                          }
                        }}
                      >
                        <div className="relative inline-flex items-center gap-2 min-w-0">
                          {tab.type === "table" ? (
                            <Table className="w-4 h-4 text-accent" />
                          ) : tab.type === "redis-key" ? (
                            <KeyRound className="w-4 h-4 text-accent" />
                          ) : tab.type === "redis-browser" ? (
                            <LayoutDashboard className="w-4 h-4 text-accent" />
                          ) : tab.type === "redis-server-info" ? (
                            <Server className="w-4 h-4 text-accent" />
                          ) : tab.type === "elasticsearch-index" ? (
                            <FileSearch className="w-4 h-4 text-accent" />
                          ) : (
                            <FileCode className="w-4 h-4 text-accent" />
                          )}
                          <span className="max-w-[120px] flex items-center">
                            <span className="truncate">{title}</span>
                            {tab.type === "editor" && tab.isDirty && (
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 ml-1 shrink-0"
                                aria-label={t("app.tab.unsavedChanges")}
                              />
                            )}
                          </span>
                          <button
                            type="button"
                            aria-label={t("app.tab.closeAria", { title })}
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded-sm cursor-pointer transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloseTab(tab.id);
                            }}
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      </TabsTrigger>
                    </span>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onCloseTab(tab.id)}>
                      {t("app.tab.closeTab")}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onCloseOtherTabs(tab.id)}>
                      {t("app.tab.closeOtherTabs")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </SortableTab>
            );
          })}
        </SortableContext>
      </DndContext>
    </TabsList>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/layout/TabBar.tsx
git commit -m "refactor: add TabBar component for tab rendering and drag-and-drop"
```

---

### Task 8: 创建 TabContentRenderer 组件

**Files:**
- Create: `src/components/layout/TabContentRenderer.tsx`

- [ ] **Step 1: 创建 TabContentRenderer.tsx**

从 App.tsx 中提取标签内容渲染逻辑（第 2113-2420 行），创建独立组件。

```typescript
// src/components/layout/TabContentRenderer.tsx
import { lazy, Suspense } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { FileCode } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TableView } from "@/components/business/DataGrid/TableView";
import { TableMetadataView } from "@/components/business/Metadata/TableMetadataView";
import { RoutineMetadataView } from "@/components/business/Metadata/RoutineMetadataView";
import { isMysqlFamilyDriver } from "@/lib/driver-registry";
import type { TabItem } from "@/App";
import type { SingleResultState } from "@/lib/queryExecutionState";
import type { SavedQuery, SchemaOverview } from "@/services/api";
import { useTranslation } from "react-i18next";

const SqlEditor = lazy(async () => {
  const mod = await import("@/components/business/Editor/SqlEditor");
  return { default: mod.SqlEditor };
});
const RedisKeyView = lazy(async () => {
  const mod = await import("@/components/business/Redis/RedisKeyView");
  return { default: mod.RedisKeyView };
});
const RedisConsole = lazy(async () => {
  const mod = await import("@/components/business/Redis/RedisConsole");
  return { default: mod.RedisConsole };
});
const RedisBrowserView = lazy(async () => {
  const mod = await import("@/components/business/Redis/RedisBrowserView");
  return { default: mod.RedisBrowserView };
});
const RedisServerInfoView = lazy(async () => {
  const mod = await import("@/components/business/Redis/RedisServerInfoView");
  return { default: mod.RedisServerInfoView };
});
const ElasticsearchIndexView = lazy(async () => {
  const mod = await import("@/components/business/Elasticsearch/ElasticsearchIndexView");
  return { default: mod.ElasticsearchIndexView };
});
const ERDiagramView = lazy(async () => {
  const mod = await import("@/components/business/ERDiagram/ERDiagramView");
  return { default: mod.default };
});
const CreateTableView = lazy(async () => {
  const mod = await import("@/components/business/CreateTable/CreateTableView");
  return { default: mod.CreateTableView };
});
const AlterTableView = lazy(async () => {
  const mod = await import("@/components/business/CreateTable/AlterTableView");
  return { default: mod.AlterTableView });
});

function LazyPanelFallback({
  label,
  className = "h-full",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`${className} flex items-center justify-center text-sm text-muted-foreground`}
    >
      {label}
    </div>
  );
}

interface TabContentRendererProps {
  tabs: TabItem[];
  // ... 所有处理函数 props
}

export function TabContentRenderer({ tabs, ...handlers }: TabContentRendererProps) {
  const { t } = useTranslation();
  const isDefaultQueryTitle = (title?: string) =>
    !!title && /^(Query \(|查询（|クエリ（)/.test(title);

  return (
    <>
      {tabs.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t("app.empty.hint")}</p>
          </div>
        </div>
      ) : (
        tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            forceMount
            className="h-full m-0"
          >
            <ErrorBoundary>
              {/* 从 App.tsx 复制所有 tab.type 条件渲染逻辑 */}
              {/* ... */}
            </ErrorBoundary>
          </TabsContent>
        ))
      )}
    </>
  );
}
```

- [ ] **Step 2: 从 App.tsx 完整复制所有标签类型渲染逻辑到组件中**

需要从 App.tsx 第 2121-2416 行复制所有条件渲染分支。

- [ ] **Step 3: 提交**

```bash
git add src/components/layout/TabContentRenderer.tsx
git commit -m "refactor: add TabContentRenderer component for tab content rendering"
```

---

### Task 9: 创建 UnsavedChangesDialog 组件

**Files:**
- Create: `src/components/layout/UnsavedChangesDialog.tsx`

- [ ] **Step 1: 创建 UnsavedChangesDialog.tsx**

```typescript
// src/components/layout/UnsavedChangesDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SaveQueryDialog } from "@/components/business/Editor/SaveQueryDialog";
import { useTranslation } from "react-i18next";
import type { TabItem } from "@/App";

interface UnsavedChangesDialogProps {
  isUnsavedConfirmOpen: boolean;
  isCloseSaveDialogOpen: boolean;
  currentCloseTab?: TabItem;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
  onSaveDialogOpenChange: (open: boolean) => void;
  onSaveComplete: (name: string, description: string) => Promise<void>;
  isDefaultQueryTitle: (title?: string) => boolean;
}

export function UnsavedChangesDialog({
  isUnsavedConfirmOpen,
  isCloseSaveDialogOpen,
  currentCloseTab,
  onCancel,
  onDiscard,
  onSave,
  onSaveDialogOpenChange,
  onSaveComplete,
  isDefaultQueryTitle,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();

  return (
    <>
      <AlertDialog
        open={isUnsavedConfirmOpen}
        onOpenChange={(open) => {
          if (!open) onCancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("app.dialog.unsavedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("app.dialog.unsavedDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDiscard}>
              {t("app.dialog.dontSave")}
            </AlertDialogAction>
            <AlertDialogAction onClick={onSave}>
              {t("common.save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SaveQueryDialog
        open={isCloseSaveDialogOpen}
        onOpenChange={onSaveDialogOpenChange}
        onSave={onSaveComplete}
        initialName={
          currentCloseTab && !isDefaultQueryTitle(currentCloseTab.title)
            ? currentCloseTab.title
            : ""
        }
        initialDescription={currentCloseTab?.savedQueryDescription}
      />
    </>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/layout/UnsavedChangesDialog.tsx
git commit -m "refactor: add UnsavedChangesDialog component"
```

---

### Task 10: 创建 AppLayout 组件

**Files:**
- Create: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: 创建 AppLayout.tsx**

```typescript
// src/components/layout/AppLayout.tsx
import { Suspense, type MouseEvent } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Loader2 } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@/services/api";
import { Sidebar } from "@/components/business/Sidebar/Sidebar";
import { useTranslation } from "react-i18next";
import type { SidebarLayoutMode } from "@/hooks/useTabManager";

const AISidebar = lazy(async () => {
  const mod = await import("@/components/business/Sidebar/AISidebar");
  return { default: mod.AISidebar };
});

function LazyPanelFallback({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

interface AppLayoutProps {
  aiVisible: boolean;
  isFullscreen: boolean;
  sidebarLayout: SidebarLayoutMode;
  sidebarProps: any; // Sidebar 组件需要的 props
  activeTabItem?: any;
  windowActions: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({
  aiVisible,
  isFullscreen,
  sidebarLayout,
  sidebarProps,
  activeTabItem,
  windowActions,
  children,
}: AppLayoutProps) {
  const { t } = useTranslation();

  const handleWindowDragStart = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (!event.currentTarget.contains(target)) return;
    if (target.closest('[data-no-drag="true"]')) return;
    getCurrentWindow()
      .startDragging()
      .catch(() => {});
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-muted/30">
      {!isFullscreen && (
        <div
          data-tauri-drag-region
          className="relative h-9 bg-background border-b border-border flex items-center pl-20 pr-2 select-none cursor-grab active:cursor-grabbing"
          onMouseDown={handleWindowDragStart}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-medium text-muted-foreground">
              DbPaw
            </span>
          </div>
          <div
            data-no-drag="true"
            className="ml-auto flex items-center gap-1 shrink-0"
          >
            {windowActions}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId={aiVisible ? "main-layout-with-ai" : "main-layout"}
        >
          <ResizablePanel
            id="left-sidebar"
            order={1}
            defaultSize={20}
            minSize={15}
            maxSize={30}
          >
            <Sidebar {...sidebarProps} layoutMode={sidebarLayout} />
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel
            id="main-panel"
            order={2}
            defaultSize={60}
            minSize={40}
          >
            {children}
          </ResizablePanel>

          <ResizableHandle />

          {aiVisible && (
            <ResizablePanel
              id="ai-sidebar"
              order={3}
              defaultSize={20}
              minSize={20}
              maxSize={40}
            >
              <Suspense fallback={<LazyPanelFallback label={t("common.loading")} />}>
                <AISidebar
                  connectionId={activeTabItem?.connectionId}
                  database={activeTabItem?.database}
                  schemaOverview={activeTabItem?.schemaOverview}
                />
              </Suspense>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "refactor: add AppLayout component for overall layout structure"
```

---

### Task 11: 重构 App.tsx 使用新 hooks 和组件

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建导出的 TabItem 类型**

在 `src/types/tab.ts` 中创建共享类型：

```typescript
// src/types/tab.ts
import type { RoutineType, SchemaOverview, SavedQuery } from "@/services/api";
import type { SingleResultState } from "@/lib/queryExecutionState";

export interface TabItem {
  id: string;
  type:
    | "editor"
    | "table"
    | "ddl"
    | "routine"
    | "create-table"
    | "alter-table"
    | "redis-key"
    | "redis-console"
    | "redis-browser"
    | "redis-server-info"
    | "elasticsearch-index"
    | "er-diagram";
  title: string;
  connection?: string;
  database?: string;
  schema?: string;
  tableName?: string;
  routineName?: string;
  routineType?: RoutineType;
  redisKey?: string;
  elasticsearchIndex?: string;
  data?: any[];
  columns?: string[];
  total?: number;
  page?: number;
  pageSize?: number;
  executionTimeMs?: number;
  connectionId?: number;
  driver?: string;
  sqlContent?: string;
  lastSavedSql?: string;
  isDirty?: boolean;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  filter?: string;
  orderBy?: string;
  queryResults?: {
    data: any[];
    columns: string[];
    executionTime: string;
    error?: string;
    resultSets?: SingleResultState[];
    activeResultSetIndex?: number;
  } | null;
  activeQueryId?: string;
  lastQueryId?: string;
  schemaOverview?: SchemaOverview;
  savedQueryId?: number;
  savedQueryDescription?: string;
  availableDatabases?: string[];
  isLoading?: boolean;
}
```

- [ ] **Step 2: 更新所有 hooks 和组件的 import 路径**

将所有 `import type { TabItem } from "@/App"` 改为 `import type { TabItem } from "@/types/tab"`。

- [ ] **Step 3: 重写 App.tsx 为轻量容器**

```typescript
// src/App.tsx — 重构后的轻量版本
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { isMysqlFamilyDriver } from "@/lib/driver-registry";
import type { TreeCallbacks } from "@/lib/tree-adapters/types.tsx";
import { api, isTauri, type SchemaOverview, type SavedQuery } from "@/services/api";
import { listen } from "@tauri-apps/api/event";
import { UpdaterChecker } from "@/components/updater-checker";
import { useTranslation } from "react-i18next";
import { getSetting } from "@/services/store";

// Hooks
import { useTabManager, type SidebarLayoutMode } from "@/hooks/useTabManager";
import { useQueryEditor } from "@/hooks/useQueryEditor";
import { useTableViewer } from "@/hooks/useTableViewer";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// Components
import { AppLayout } from "@/components/layout/AppLayout";
import { TabBar } from "@/components/layout/TabBar";
import { TabContentRenderer } from "@/components/layout/TabContentRenderer";
import { UnsavedChangesDialog } from "@/components/layout/UnsavedChangesDialog";
import { WindowActions } from "@/components/layout/WindowActions";

import type { TabItem } from "@/types/tab";

const SettingsDialog = lazy(async () => {
  const mod = await import("@/components/settings/SettingsDialog");
  return { default: mod.SettingsDialog };
});

export default function App() {
  const { t } = useTranslation();

  // UI 状态
  const [aiVisible, setAiVisible] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarLayout, setSidebarLayout] = useState<SidebarLayoutMode>("tabs");
  const [showColumnComments, setShowColumnComments] = useState(false);
  const [showRowNumbers, setShowRowNumbers] = useState(true);
  const [showZebraStripes, setShowZebraStripes] = useState(false);
  const [queriesLastUpdated, setQueriesLastUpdated] = useState(0);
  const [sidebarRevealRequest, setSidebarRevealRequest] = useState<any>();
  const [redisRefreshRequest, setRedisRefreshRequest] = useState<any>();

  // 核心 hooks
  const {
    tabs, setTabs, activeTab, setActiveTab,
    handleMainTabChange, closeTabNow, handleDragEnd, handleCycleTabs,
  } = useTabManager();

  const {
    handleCreateQuery, handleSqlChange, handleExecuteQuery, saveEditorTab,
    resolveTableScope,
  } = useQueryEditor({ tabs, setTabs, setActiveTab, setQueriesLastUpdated, t });

  const {
    handleTableSelect, handleTableRefresh, handlePageChange,
    handlePageSizeChange, handleSortChange, handleFilterChange,
  } = useTableViewer({ tabs, setTabs, setActiveTab, resolveTableScope, t });

  const {
    handleCloseTab, handleCloseOtherTabs, isUnsavedConfirmOpen,
    isCloseSaveDialogOpen, currentCloseTab, handleUnsavedCloseCancel,
    handleUnsavedCloseWithoutSave, handleUnsavedCloseSave,
    handleCloseSaveDialogOpenChange, handleCloseFlowSave,
  } = useUnsavedChanges({ tabs, closeTabNow, saveEditorTab });

  useKeyboardShortcuts({
    tabs, activeTab, handleCycleTabs, handleCloseTab,
    handleCreateQuery, setAiVisible, setOpenSettings,
  });

  // 设置初始化
  useEffect(() => {
    void getSetting<SidebarLayoutMode>("sidebarLayout", "tabs").then(
      (layout) => setSidebarLayout(layout === "tree" ? "tree" : "tabs"),
    );
    void getSetting("showColumnComments", false).then(setShowColumnComments);
    void getSetting("showRowNumbers", true).then(setShowRowNumbers);
    void getSetting("showZebraStripes", false).then(setShowZebraStripes);
  }, []);

  // Tauri 事件监听
  useEffect(() => {
    if (!isTauri()) return;
    const unlistenSettings = listen("open-settings", () => setOpenSettings(true));
    return () => { unlistenSettings.then((f) => f()); };
  }, []);

  // ... 其余辅助函数（handleOpenRedisConsole, handleOpenRedisBrowser 等）

  const isDefaultQueryTitle = (title?: string) =>
    !!title && /^(Query \(|查询（|クエリ（)/.test(title);

  const activeTabItem = tabs.find((t) => t.id === activeTab);
  const tableTabTitleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tabs.forEach((tab) => {
      if (tab.type !== "table") return;
      counts.set(tab.title, (counts.get(tab.title) || 0) + 1);
    });
    return counts;
  }, [tabs]);

  return (
    <AppLayout
      aiVisible={aiVisible}
      isFullscreen={isFullscreen}
      sidebarLayout={sidebarLayout}
      activeTabItem={activeTabItem}
      windowActions={
        <WindowActions
          aiVisible={aiVisible}
          onToggleAi={() => setAiVisible((v) => !v)}
          onOpenSettings={() => setOpenSettings(true)}
        />
      }
      sidebarProps={{ /* ... */ }}
    >
      <Tabs
        value={activeTab}
        onValueChange={handleMainTabChange}
        className="h-full flex flex-col"
      >
        <div className="bg-background border-b border-border flex items-center h-9">
          <div className="min-w-0 flex-1">
            <TabBar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleMainTabChange}
              onDragEnd={handleDragEnd}
              onCloseTab={handleCloseTab}
              onCloseOtherTabs={handleCloseOtherTabs}
              tableTabTitleCounts={tableTabTitleCounts}
            />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <TabContentRenderer
            tabs={tabs}
            /* ... 所有处理函数 */
          />
        </div>
      </Tabs>
      <UnsavedChangesDialog
        isUnsavedConfirmOpen={isUnsavedConfirmOpen}
        isCloseSaveDialogOpen={isCloseSaveDialogOpen}
        currentCloseTab={currentCloseTab}
        onCancel={handleUnsavedCloseCancel}
        onDiscard={handleUnsavedCloseWithoutSave}
        onSave={handleUnsavedCloseSave}
        onSaveDialogOpenChange={handleCloseSaveDialogOpenChange}
        onSaveComplete={handleCloseFlowSave}
        isDefaultQueryTitle={isDefaultQueryTitle}
      />
      {openSettings && (
        <Suspense fallback={null}>
          <SettingsDialog
            open={openSettings}
            onOpenChange={setOpenSettings}
            sidebarLayout={sidebarLayout}
            onSidebarLayoutChange={setSidebarLayout}
            showColumnComments={showColumnComments}
            onShowColumnCommentsChange={setShowColumnComments}
            showRowNumbers={showRowNumbers}
            onShowRowNumbersChange={setShowRowNumbers}
            showZebraStripes={showZebraStripes}
            onShowZebraStripesChange={setShowZebraStripes}
          />
        </Suspense>
      )}
      <UpdaterChecker />
    </AppLayout>
  );
}
```

- [ ] **Step 4: 运行 TypeScript 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 运行所有现有测试**

```bash
bun test src/services/ src/lib/
```

- [ ] **Step 6: 提交**

```bash
git add src/App.tsx src/types/tab.ts
git commit -m "refactor: rewrite App.tsx using extracted hooks and components"
```

---

### Task 12: 最终验证

**Files:**
- None (verification only)

- [ ] **Step 1: 运行完整类型检查**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 2: 运行所有单元测试**

```bash
bun test
```

Expected: 所有测试通过

- [ ] **Step 3: 运行 lint**

```bash
npm run lint
```

Expected: 无错误

- [ ] **Step 4: 验证 App.tsx 行数**

```bash
wc -l src/App.tsx
```

Expected: 少于 500 行

- [ ] **Step 5: 启动开发服务器验证功能**

```bash
npm run dev
```

手动验证：
- 标签创建/关闭/切换
- SQL 编辑器执行查询
- 表格数据查看/分页/排序/过滤
- Redis 键查看
- Elasticsearch 索引查看
- 未保存更改确认对话框
- 键盘快捷键
- AI 侧边栏
- 设置对话框

- [ ] **Step 6: 最终提交**

```bash
git add -A
git commit -m "refactor: complete App.tsx decomposition into hooks and components"
```
