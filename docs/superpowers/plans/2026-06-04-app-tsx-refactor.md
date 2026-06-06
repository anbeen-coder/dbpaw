# App.tsx Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce App.tsx from 837 lines to ~180 lines by extracting 4 focused hooks.

**Architecture:** Extract tab-opening handlers into `useTabFactory`, tree callbacks into `useTreeCallbacks`, settings state into `useAppSettings`, and fullscreen tracking into `useWindowFullscreen`. App.tsx becomes a thin composition layer.

**Tech Stack:** React hooks, TypeScript, Tauri API

---

## File Map

| File | Action | Lines |
|------|--------|-------|
| `src/hooks/useTabFactory.ts` | Create | ~180 |
| `src/hooks/useTreeCallbacks.ts` | Create | ~55 |
| `src/hooks/useAppSettings.ts` | Create | ~35 |
| `src/hooks/useWindowFullscreen.ts` | Create | ~30 |
| `src/App.tsx` | Rewrite | ~180 |

---

### Task 1: Create `useTabFactory`

**Files:**
- Create: `src/hooks/useTabFactory.ts`

This hook consolidates all 8 tab-opening handlers + 2 export handlers. Each handler follows the same pattern: check for existing tab → create new tab → setActiveTab.

- [ ] **Step 1: Create the hook file**

```ts
// src/hooks/useTabFactory.ts
import { useCallback } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import type { RoutineType } from "@/services/api";
import type { TabItem } from "@/types/tab";

interface UseTabFactoryParams {
  tabs: TabItem[];
  setTabs: React.Dispatch<React.SetStateAction<TabItem[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  t: (key: string, options?: any) => string;
}

export function useTabFactory({
  tabs,
  setTabs,
  setActiveTab,
  t,
}: UseTabFactoryParams) {
  const openOrCreateTab = useCallback(
    (tabId: string, tabData: Omit<TabItem, "id">) => {
      const existing = tabs.find((t) => t.id === tabId);
      if (existing) {
        setActiveTab(tabId);
        return;
      }
      setTabs((prev) => [...prev, { id: tabId, ...tabData }]);
      setActiveTab(tabId);
    },
    [tabs, setTabs, setActiveTab],
  );

  const openRedisConsole = useCallback(
    (connection: string, database: string, connectionId: number, driver: string) => {
      openOrCreateTab(`redis-console-${connectionId}-${database}`, {
        type: "redis-console",
        title: `Console · ${database}`,
        connection,
        database,
        connectionId,
        driver,
      });
    },
    [openOrCreateTab],
  );

  const openRedisBrowser = useCallback(
    (connection: string, database: string, connectionId: number, driver: string) => {
      openOrCreateTab(`redis-browser-${connectionId}-${database}`, {
        type: "redis-browser",
        title: `Browser · ${database}`,
        connection,
        database,
        connectionId,
        driver,
      });
    },
    [openOrCreateTab],
  );

  const openRedisServerInfo = useCallback(
    (connection: string, database: string, connectionId: number, driver: string) => {
      openOrCreateTab(`redis-server-info-${connectionId}-${database}`, {
        type: "redis-server-info",
        title: `Server Info · ${database}`,
        connection,
        database,
        connectionId,
        driver,
      });
    },
    [openOrCreateTab],
  );

  const openElasticsearchIndex = useCallback(
    (connection: string, index: string, connectionId: number, driver: string) => {
      openOrCreateTab(`elasticsearch-${connectionId}-${index}`, {
        type: "elasticsearch-index",
        title: index,
        connection,
        connectionId,
        driver,
        elasticsearchIndex: index,
      });
    },
    [openOrCreateTab],
  );

  const openTableDDL = useCallback(
    (ctx: { connectionId: number; database: string; schema: string; table: string }) => {
      openOrCreateTab(`ddl-${ctx.connectionId}-${ctx.database}-${ctx.schema}-${ctx.table}`, {
        type: "ddl",
        title: t("app.tab.ddlTitle", { table: ctx.table }),
        connectionId: ctx.connectionId,
        database: ctx.database,
        schema: ctx.schema,
        tableName: ctx.table,
      });
    },
    [openOrCreateTab, t],
  );

  const openRoutine = useCallback(
    (
      connection: string,
      database: string,
      schema: string,
      name: string,
      routineType: RoutineType,
      connectionId: number,
      driver: string,
    ) => {
      openOrCreateTab(`routine-${connectionId}-${database}-${schema}-${routineType}-${name}`, {
        type: "routine",
        title: name,
        connection,
        database,
        schema,
        routineName: name,
        routineType,
        connectionId,
        driver,
      });
    },
    [openOrCreateTab],
  );

  const openCreateTable = useCallback(
    (connectionId: number, database: string, schema: string, driver: string) => {
      const tabId = `create-table-${connectionId}-${database}-${schema}-${Date.now()}`;
      openOrCreateTab(tabId, {
        type: "create-table",
        title: t("createTable.tab.title", { database: database || "—" }),
        connectionId,
        database,
        schema,
        driver,
      });
    },
    [openOrCreateTab, t],
  );

  const openAlterTable = useCallback(
    (connectionId: number, database: string, schema: string, table: string, driver: string) => {
      openOrCreateTab(`alter-table-${connectionId}-${database}-${schema}-${table}`, {
        type: "alter-table",
        title: t("alterTable.tab.title", { table }),
        connectionId,
        database,
        schema,
        tableName: table,
        driver,
      });
    },
    [openOrCreateTab, t],
  );

  const openRedisKey = useCallback(
    (connection: string, database: string, redisKey: string, connectionId: number, driver: string) => {
      openOrCreateTab(`redis-${connectionId}-${database}-${redisKey}`, {
        type: "redis-key",
        title: redisKey || "New Redis key",
        connection,
        database,
        redisKey,
        connectionId,
        driver,
      });
    },
    [openOrCreateTab],
  );

  const openERDiagram = useCallback(
    (ctx?: { connectionId?: number; database?: string }) => {
      const connectionId = ctx?.connectionId;
      const database = ctx?.database;
      if (!connectionId || !database) return;

      openOrCreateTab(`er-diagram-${database}`, {
        type: "er-diagram",
        title: `ER - ${database}`,
        connectionId,
        database,
      });
    },
    [openOrCreateTab],
  );

  const exportTable = useCallback(
    async (
      ctx: {
        connectionId: number;
        database: string;
        schema: string;
        table: string;
        driver: string;
      },
      format: "csv" | "json" | "sql_dml" | "sql_ddl" | "sql_full",
      filePath: string,
    ) => {
      try {
        const result = await api.transfer.exportTable({
          id: ctx.connectionId,
          database: ctx.database,
          schema: ctx.schema,
          table: ctx.table,
          driver: ctx.driver,
          format,
          scope: "full_table",
          filePath,
        });
        toast.success(t("app.success.exportCompleted", { count: result.rowCount }), {
          description: result.filePath,
        });
      } catch (e) {
        toast.error(t("app.error.exportFailed"), {
          description: errorMessage(e),
        });
      }
    },
    [t],
  );

  const exportDatabase = useCallback(
    async (ctx: {
      connectionId: number;
      database: string;
      driver: string;
      format: "sql_dml" | "sql_ddl" | "sql_full";
      filePath: string;
    }) => {
      try {
        const result = await api.transfer.exportDatabase({
          id: ctx.connectionId,
          database: ctx.database,
          driver: ctx.driver,
          format: ctx.format,
          filePath: ctx.filePath,
        });
        toast.success(t("app.success.exportCompleted", { count: result.rowCount }), {
          description: result.filePath,
        });
      } catch (e) {
        toast.error(t("app.error.exportFailed"), {
          description: errorMessage(e),
        });
      }
    },
    [t],
  );

  return {
    openRedisConsole,
    openRedisBrowser,
    openRedisServerInfo,
    openRedisKey,
    openElasticsearchIndex,
    openTableDDL,
    openRoutine,
    openCreateTable,
    openAlterTable,
    openERDiagram,
    exportTable,
    exportDatabase,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/hooks/useTabFactory.ts`
Expected: No errors

---

### Task 2: Create `useTreeCallbacks`

**Files:**
- Create: `src/hooks/useTreeCallbacks.ts`

Uses `useRef` to hold latest handler references so the memoized callbacks stay current.

- [ ] **Step 1: Create the hook file**

```ts
// src/hooks/useTreeCallbacks.ts
import { useEffect, useMemo, useRef } from "react";
import type { TreeCallbacks } from "@/lib/tree-adapters/types.tsx";

interface UseTreeCallbacksParams {
  openRedisKey: (connection: string, database: string, redisKey: string, connectionId: number, driver: string) => void;
  openRedisBrowser: (connection: string, database: string, connectionId: number, driver: string) => void;
  openRedisConsole: (connection: string, database: string, connectionId: number, driver: string) => void;
  openRedisServerInfo: (connection: string, database: string, connectionId: number, driver: string) => void;
  openElasticsearchIndex: (connection: string, index: string, connectionId: number, driver: string) => void;
}

export function useTreeCallbacks({
  openRedisKey,
  openRedisBrowser,
  openRedisConsole,
  openRedisServerInfo,
  openElasticsearchIndex,
}: UseTreeCallbacksParams): TreeCallbacks {
  const handlersRef = useRef({
    openRedisKey,
    openRedisBrowser,
    openRedisConsole,
    openRedisServerInfo,
    openElasticsearchIndex,
  });

  useEffect(() => {
    handlersRef.current = {
      openRedisKey,
      openRedisBrowser,
      openRedisConsole,
      openRedisServerInfo,
      openElasticsearchIndex,
    };
  });

  return useMemo<TreeCallbacks>(
    () => ({
      onKeySelect: (ctx) => {
        handlersRef.current.openRedisKey(
          ctx.connectionName,
          ctx.databaseName,
          ctx.leafName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onCreateKey: (ctx) => {
        handlersRef.current.openRedisKey(
          ctx.connectionName,
          ctx.databaseName,
          "",
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onOpenBrowser: (ctx) => {
        handlersRef.current.openRedisBrowser(
          ctx.connectionName,
          ctx.databaseName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onOpenConsole: (ctx) => {
        handlersRef.current.openRedisConsole(
          ctx.connectionName,
          ctx.databaseName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onOpenServerInfo: (ctx) => {
        handlersRef.current.openRedisServerInfo(
          ctx.connectionName,
          ctx.databaseName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onOpenIndex: (ctx) => {
        handlersRef.current.openElasticsearchIndex(
          ctx.connectionName,
          ctx.leafName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
    }),
    [],
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/hooks/useTreeCallbacks.ts`
Expected: No errors

---

### Task 3: Create `useAppSettings`

**Files:**
- Create: `src/hooks/useAppSettings.ts`

- [ ] **Step 1: Create the hook file**

```ts
// src/hooks/useAppSettings.ts
import { useEffect, useState } from "react";
import { getSetting } from "@/services/store";

export type SidebarLayoutMode = "tabs" | "tree";

export function useAppSettings() {
  const [sidebarLayout, setSidebarLayout] = useState<SidebarLayoutMode>("tabs");
  const [showColumnComments, setShowColumnComments] = useState(false);
  const [showRowNumbers, setShowRowNumbers] = useState(true);
  const [showZebraStripes, setShowZebraStripes] = useState(false);

  useEffect(() => {
    void getSetting<SidebarLayoutMode>("sidebarLayout", "tabs").then((layout) => {
      setSidebarLayout(layout === "tree" ? "tree" : "tabs");
    });
    void getSetting("showColumnComments", false).then(setShowColumnComments);
    void getSetting("showRowNumbers", true).then(setShowRowNumbers);
    void getSetting("showZebraStripes", false).then(setShowZebraStripes);
  }, []);

  return {
    sidebarLayout,
    setSidebarLayout,
    showColumnComments,
    setShowColumnComments,
    showRowNumbers,
    setShowRowNumbers,
    showZebraStripes,
    setShowZebraStripes,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/hooks/useAppSettings.ts`
Expected: No errors

---

### Task 4: Create `useWindowFullscreen`

**Files:**
- Create: `src/hooks/useWindowFullscreen.ts`

- [ ] **Step 1: Create the hook file**

```ts
// src/hooks/useWindowFullscreen.ts
import { useEffect, useState } from "react";
import { isTauri } from "@/services/api";

export function useWindowFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    let mounted = true;
    let unlistenResized: null | (() => void) = null;

    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      const appWindow = getCurrentWindow();

      const syncFullscreenState = async () => {
        try {
          const fullscreen = await appWindow.isFullscreen();
          if (mounted) setIsFullscreen(fullscreen);
        } catch {
          // Ignore window state lookup failures in non-native contexts.
        }
      };

      void syncFullscreenState();
      appWindow
        .onResized(() => {
          void syncFullscreenState();
        })
        .then((unlisten) => {
          unlistenResized = unlisten;
        })
        .catch(() => {});
    });

    return () => {
      mounted = false;
      if (unlistenResized) unlistenResized();
    };
  }, []);

  return isFullscreen;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/hooks/useWindowFullscreen.ts`
Expected: No errors

---

### Task 5: Rewrite App.tsx to use new hooks

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Replace the entire file with the refactored version that uses the 4 new hooks. The file should be ~180 lines.

Key changes:
- Remove all 8 tab-opening handlers (lines 208-449) → replaced by `useTabFactory`
- Remove export handlers (lines 451-512) → replaced by `useTabFactory`
- Remove treeCallbacks memo (lines 543-597) → replaced by `useTreeCallbacks`
- Remove settings state + effect (lines 109-112, 607-616) → replaced by `useAppSettings`
- Remove fullscreen tracking (lines 636-666) → replaced by `useWindowFullscreen`
- Keep: `resolveTableScope`, sidebar reveal logic, tab linkage, keyboard shortcuts, Tauri event listeners, JSX render

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npm run lint` (or equivalent)
Expected: No errors

- [ ] **Step 4: Verify app builds**

Run: `npm run build` (or equivalent)
Expected: Successful build

---

### Task 6: Final verification

- [ ] **Step 1: Count lines in App.tsx**

Run: `wc -l src/App.tsx`
Expected: ~180 lines (down from 837)

- [ ] **Step 2: Verify no regressions**

Run the app manually and verify:
- Tab opening works for all types (editor, table, DDL, routine, Redis, Elasticsearch, ER diagram)
- Sidebar reveal works when switching tabs
- Export works from tree context menu
- Settings dialog opens and persists
- Fullscreen detection works
