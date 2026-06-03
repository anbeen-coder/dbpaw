import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Tabs } from "@/components/ui/tabs";
import type { RedisRefreshRequest } from "@/components/business/Sidebar/ConnectionList";
import { Loader2 } from "lucide-react";
import { isMysqlFamilyDriver } from "@/lib/driver-registry";
import type { TreeCallbacks } from "@/lib/tree-adapters/types.tsx";
import {
  api,
  isTauri,
  type RoutineType,
} from "@/services/api";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { UpdaterChecker } from "@/components/updater-checker";
import { useTranslation } from "react-i18next";
import { getSetting } from "@/services/store";

import { useTabManager } from "@/hooks/useTabManager";
import { useQueryEditor } from "@/hooks/useQueryEditor";
import { useTableViewer } from "@/hooks/useTableViewer";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

import { AppLayout } from "@/components/layout/AppLayout";
import { TabBar } from "@/components/layout/TabBar";
import { TabContentRenderer } from "@/components/layout/TabContentRenderer";
import { UnsavedChangesDialog } from "@/components/layout/UnsavedChangesDialog";
import { WindowActions } from "@/components/layout/WindowActions";

import type { TabItem } from "@/types/tab";

type ActiveTableTarget = {
  connectionId: number;
  database: string;
  table: string;
  schema?: string;
};

type SidebarRevealRequest = ActiveTableTarget & {
  id: number;
};

type SidebarLayoutMode = "tabs" | "tree";

const SettingsDialog = lazy(async () => {
  const mod = await import("@/components/settings/SettingsDialog");
  return { default: mod.SettingsDialog };
});

function getTableTargetFromTab(tab?: TabItem): ActiveTableTarget | undefined {
  if (
    tab &&
    (tab.type === "table" || tab.type === "ddl") &&
    tab.connectionId &&
    tab.database &&
    tab.tableName
  ) {
    return {
      connectionId: tab.connectionId,
      database: tab.database,
      table: tab.tableName,
      schema: tab.schema,
    };
  }

  return undefined;
}

export default function App() {
  const { t } = useTranslation();

  const resolveTableScope = (
    driver: string,
    database?: string,
    schemaOverride?: string,
  ) => {
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
  };

  const [aiVisible, setAiVisible] = useState(false);
  const [sidebarRevealRequest, setSidebarRevealRequest] =
    useState<SidebarRevealRequest>();
  const [openSettings, setOpenSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [queriesLastUpdated, setQueriesLastUpdated] = useState(0);
  const [sidebarLayout, setSidebarLayout] = useState<SidebarLayoutMode>("tabs");
  const [showColumnComments, setShowColumnComments] = useState(false);
  const [showRowNumbers, setShowRowNumbers] = useState(true);
  const [showZebraStripes, setShowZebraStripes] = useState(false);
  const sidebarRevealRequestIdRef = useRef(0);
  const redisRefreshIdRef = useRef(0);
  const [redisRefreshRequest, setRedisRefreshRequest] = useState<
    RedisRefreshRequest | undefined
  >(undefined);

  const isDefaultQueryTitle = (title?: string) =>
    !!title && /^(Query \(|查询（|クエリ（)/.test(title);

  const { tabs, setTabs, activeTab, setActiveTab, handleDragEnd, handleCycleTabs: baseHandleCycleTabs, closeTabNow: baseCloseTabNow } = useTabManager();

  const { handleCreateQuery, handleOpenSavedQuery, handleSqlChange, handleExecuteQuery, handleEditorDatabaseChange, saveEditorTab } = useQueryEditor({
    tabs,
    setTabs,
    setActiveTab,
    setQueriesLastUpdated,
    t,
  });

  const { handleTableSelect, handleTableRefresh, handlePageChange, handlePageSizeChange, handleSortChange, handleFilterChange } = useTableViewer({
    tabs,
    setTabs,
    setActiveTab,
    resolveTableScope,
    t,
  });

  const { handleCloseTab, handleCloseOtherTabs, isUnsavedConfirmOpen, isCloseSaveDialogOpen, currentCloseTab, handleUnsavedCloseCancel, handleUnsavedCloseWithoutSave, handleUnsavedCloseSave, handleCloseSaveDialogOpenChange, handleCloseFlowSave } = useUnsavedChanges({
    tabs,
    closeTabNow: baseCloseTabNow,
    saveEditorTab,
  });

  const revealSidebarForTab = useCallback(
    (tabId: string, sourceTabs = tabs) => {
      const target = getTableTargetFromTab(
        sourceTabs.find((tab) => tab.id === tabId),
      );
      if (!target) return;

      setSidebarRevealRequest({
        ...target,
        id: ++sidebarRevealRequestIdRef.current,
      });
    },
    [tabs],
  );

  const handleMainTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      revealSidebarForTab(tabId);
    },
    [setActiveTab, revealSidebarForTab],
  );

  const closeTabNow = useCallback(
    (tabId: string) => {
      baseCloseTabNow(tabId, revealSidebarForTab);
    },
    [baseCloseTabNow, revealSidebarForTab],
  );

  const handleCycleTabs = useCallback(
    (direction: 1 | -1) => {
      baseHandleCycleTabs(direction);
      const nextIndex =
        (tabs.findIndex((t) => t.id === activeTab) + direction + tabs.length) %
        tabs.length;
      if (tabs[nextIndex]) {
        revealSidebarForTab(tabs[nextIndex].id);
      }
    },
    [baseHandleCycleTabs, tabs, activeTab, revealSidebarForTab],
  );

  const handleCloseOtherTabsWithReveal = useCallback(
    (tabId: string) => {
      handleCloseOtherTabs(tabId);
      setActiveTab(tabId);
      revealSidebarForTab(tabId);
    },
    [handleCloseOtherTabs, setActiveTab, revealSidebarForTab],
  );

  useKeyboardShortcuts({
    tabs,
    activeTab,
    handleCycleTabs,
    handleCloseTab,
    handleCreateQuery,
    setAiVisible,
    setOpenSettings,
  });

  const handleOpenRedisConsole = (
    connection: string,
    database: string,
    connectionId: number,
    driver: string,
  ) => {
    const tabId = `redis-console-${connectionId}-${database}`;
    const existingTab = tabs.find((t) => t.id === tabId);
    if (existingTab) {
      setActiveTab(tabId);
      return;
    }
    setTabs((prev) => [
      ...prev,
      {
        id: tabId,
        type: "redis-console",
        title: `Console · ${database}`,
        connection,
        database,
        connectionId,
        driver,
      },
    ]);
    setActiveTab(tabId);
  };

  const handleOpenRedisBrowser = (
    connection: string,
    database: string,
    connectionId: number,
    driver: string,
  ) => {
    const tabId = `redis-browser-${connectionId}-${database}`;
    const existingTab = tabs.find((t) => t.id === tabId);
    if (existingTab) {
      setActiveTab(tabId);
      return;
    }
    setTabs((prev) => [
      ...prev,
      {
        id: tabId,
        type: "redis-browser",
        title: `Browser · ${database}`,
        connection,
        database,
        connectionId,
        driver,
      },
    ]);
    setActiveTab(tabId);
  };

  const handleOpenRedisServerInfo = (
    connection: string,
    database: string,
    connectionId: number,
    driver: string,
  ) => {
    const tabId = `redis-server-info-${connectionId}-${database}`;
    const existingTab = tabs.find((t) => t.id === tabId);
    if (existingTab) {
      setActiveTab(tabId);
      return;
    }
    setTabs((prev) => [
      ...prev,
      {
        id: tabId,
        type: "redis-server-info",
        title: `Server Info · ${database}`,
        connection,
        database,
        connectionId,
        driver,
      },
    ]);
    setActiveTab(tabId);
  };

  const handleOpenElasticsearchIndex = (
    connection: string,
    index: string,
    connectionId: number,
    driver: string,
  ) => {
    const tabId = `elasticsearch-${connectionId}-${index}`;
    const existingTab = tabs.find((t) => t.id === tabId);
    if (existingTab) {
      setActiveTab(tabId);
      return;
    }
    setTabs((prev) => [
      ...prev,
      {
        id: tabId,
        type: "elasticsearch-index",
        title: index,
        connection,
        connectionId,
        driver,
        elasticsearchIndex: index,
      },
    ]);
    setActiveTab(tabId);
  };

  const handleOpenTableDDL = (ctx: {
    connectionId: number;
    database: string;
    schema: string;
    table: string;
  }) => {
    const tabId = `ddl-${ctx.connectionId}-${ctx.database}-${ctx.schema}-${ctx.table}`;
    const existingTab = tabs.find((t) => t.id === tabId);
    if (existingTab) {
      setActiveTab(tabId);
      return;
    }

    const newTab: TabItem = {
      id: tabId,
      type: "ddl",
      title: t("app.tab.ddlTitle", { table: ctx.table }),
      connectionId: ctx.connectionId,
      database: ctx.database,
      schema: ctx.schema,
      tableName: ctx.table,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(tabId);
  };

  const handleRoutineSelect = (
    connection: string,
    database: string,
    schema: string,
    name: string,
    routineType: RoutineType,
    connectionId: number,
    driver: string,
  ) => {
    const tabId = `routine-${connectionId}-${database}-${schema}-${routineType}-${name}`;
    const existingTab = tabs.find((t) => t.id === tabId);
    if (existingTab) {
      setActiveTab(tabId);
      return;
    }

    const newTab: TabItem = {
      id: tabId,
      type: "routine",
      title: name,
      connection,
      database,
      schema,
      routineName: name,
      routineType,
      connectionId,
      driver,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(tabId);
  };

  const handleCreateTable = (
    connectionId: number,
    database: string,
    schema: string,
    driver: string,
  ) => {
    const tabId = `create-table-${connectionId}-${database}-${schema}-${Date.now()}`;
    const newTab: TabItem = {
      id: tabId,
      type: "create-table",
      title: t("createTable.tab.title", { database: database || "—" }),
      connectionId,
      database,
      schema,
      driver,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(tabId);
  };

  const handleCreateTableSuccess = (
    tabId: string,
    connectionId: number,
    database: string,
    schema: string | undefined,
    tableName: string,
    driver: string,
  ) => {
    closeTabNow(tabId);
    void handleTableSelect(
      String(connectionId),
      database,
      tableName,
      connectionId,
      driver,
      schema,
    );
    setSidebarRevealRequest({
      id: Date.now(),
      connectionId,
      database,
      table: tableName,
      schema,
    });
  };

  const handleAlterTable = (
    connectionId: number,
    database: string,
    schema: string,
    table: string,
    driver: string,
  ) => {
    const tabId = `alter-table-${connectionId}-${database}-${schema}-${table}`;
    const existingTab = tabs.find((t) => t.id === tabId);
    if (existingTab) {
      setActiveTab(tabId);
      return;
    }
    const newTab: TabItem = {
      id: tabId,
      type: "alter-table",
      title: t("alterTable.tab.title", { table }),
      connectionId,
      database,
      schema,
      tableName: table,
      driver,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(tabId);
  };

  const handleAlterTableSuccess = (tabId: string) => {
    closeTabNow(tabId);
  };

  const handleExportTableFromTree = async (
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
      toast.success(
        t("app.success.exportCompleted", { count: result.rowCount }),
        {
          description: result.filePath,
        },
      );
    } catch (e) {
      toast.error(t("app.error.exportFailed"), {
        description: errorMessage(e),
      });
    }
  };

  const handleExportDatabaseFromTree = async (ctx: {
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
      toast.success(
        t("app.success.exportCompleted", { count: result.rowCount }),
        {
          description: result.filePath,
        },
      );
    } catch (e) {
      toast.error(t("app.error.exportFailed"), {
        description: errorMessage(e),
      });
    }
  };

  const handleRedisKeySelect = (
    connection: string,
    database: string,
    redisKey: string,
    connectionId: number,
    driver: string,
  ) => {
    const tabId = `redis-${connectionId}-${database}-${redisKey}`;
    const existingTab = tabs.find((t) => t.id === tabId);
    if (existingTab) {
      setActiveTab(tabId);
      return;
    }
    setTabs((prev) => [
      ...prev,
      {
        id: tabId,
        type: "redis-key",
        title: redisKey || "New Redis key",
        connection,
        database,
        redisKey,
        connectionId,
        driver,
      },
    ]);
    setActiveTab(tabId);
  };

  const treeCallbacks: TreeCallbacks = useMemo(
    () => ({
      onKeySelect: (ctx) => {
        handleRedisKeySelect(
          ctx.connectionName,
          ctx.databaseName,
          ctx.leafName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onCreateKey: (ctx) => {
        handleRedisKeySelect(
          ctx.connectionName,
          ctx.databaseName,
          "",
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onOpenBrowser: (ctx) => {
        handleOpenRedisBrowser(
          ctx.connectionName,
          ctx.databaseName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onOpenConsole: (ctx) => {
        handleOpenRedisConsole(
          ctx.connectionName,
          ctx.databaseName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onOpenServerInfo: (ctx) => {
        handleOpenRedisServerInfo(
          ctx.connectionName,
          ctx.databaseName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
      onOpenIndex: (ctx) => {
        handleOpenElasticsearchIndex(
          ctx.connectionName,
          ctx.leafName,
          Number(ctx.connectionId),
          ctx.connectionType,
        );
      },
    }),
    [],
  );

  const notifyRedisRefresh = (connectionId: number, database: string) => {
    setRedisRefreshRequest({
      id: ++redisRefreshIdRef.current,
      connectionId,
      database,
    });
  };

  useEffect(() => {
    void getSetting<SidebarLayoutMode>("sidebarLayout", "tabs").then(
      (layout) => {
        setSidebarLayout(layout === "tree" ? "tree" : "tabs");
      },
    );
    void getSetting("showColumnComments", false).then(setShowColumnComments);
    void getSetting("showRowNumbers", true).then(setShowRowNumbers);
    void getSetting("showZebraStripes", false).then(setShowZebraStripes);
  }, []);

  useEffect(() => {
    if (!isTauri()) return;

    const unlistenChunk = listen("query.chunk", (_evt: any) => {});
    const unlistenProgress = listen("query.progress", () => {});
    const unlistenDone = listen("query.done", () => {});
    const unlistenSettings = listen("open-settings", () =>
      setOpenSettings(true),
    );

    return () => {
      unlistenChunk.then((f) => f());
      unlistenProgress.then((f) => f());
      unlistenDone.then((f) => f());
      unlistenSettings.then((f) => f());
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;

    const appWindow = getCurrentWindow();
    let mounted = true;
    let unlistenResized: null | (() => void) = null;

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

    return () => {
      mounted = false;
      if (unlistenResized) unlistenResized();
    };
  }, []);

  const activeTabItem = tabs.find((t) => t.id === activeTab);
  const activeTableTarget = useMemo<ActiveTableTarget | undefined>(() => {
    return getTableTargetFromTab(activeTabItem);
  }, [activeTabItem]);
  const tableTabTitleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tabs.forEach((tab) => {
      if (tab.type !== "table") return;
      counts.set(tab.title, (counts.get(tab.title) || 0) + 1);
    });
    return counts;
  }, [tabs]);

  const handleOpenERDiagram = useCallback(
    (ctx?: { connectionId?: number; database?: string }) => {
      const connectionId = ctx?.connectionId ?? activeTabItem?.connectionId;
      const database = ctx?.database ?? activeTabItem?.database;

      if (!connectionId || !database) return;

      const tabId = `er-diagram-${database}`;
      const existing = tabs.find((t) => t.id === tabId);
      if (existing) {
        setActiveTab(tabId);
        return;
      }

      const newTab: TabItem = {
        id: tabId,
        type: "er-diagram",
        title: `ER - ${database}`,
        connectionId: connectionId,
        database: database,
        schema: activeTabItem?.schema,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTab(tabId);
    },
    [activeTabItem, tabs, setActiveTab, setTabs],
  );

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
      sidebarProps={{
        onTableSelect: handleTableSelect,
        onConnect: () => {},
        onCreateQuery: handleCreateQuery,
        onRoutineSelect: handleRoutineSelect,
        onExportTable: handleExportTableFromTree,
        onExportDatabase: handleExportDatabaseFromTree,
        onCreateTable: handleCreateTable,
        onAlterTable: handleAlterTable,
        onSelectSavedQuery: handleOpenSavedQuery,
        lastUpdated: queriesLastUpdated,
        activeTableTarget,
        sidebarRevealRequest,
        redisRefreshRequest,
        treeCallbacks,
      }}
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
              onCloseOtherTabs={handleCloseOtherTabsWithReveal}
              tableTabTitleCounts={tableTabTitleCounts}
            />
          </div>
          {isFullscreen && (
            <div
              data-no-drag="true"
              className="flex items-center gap-1 shrink-0 pr-2"
            >
              <WindowActions
                aiVisible={aiVisible}
                onToggleAi={() => setAiVisible((v) => !v)}
                onOpenSettings={() => setOpenSettings(true)}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          <TabContentRenderer
            tabs={tabs}
            activeTab={activeTab}
            handleExecuteQuery={handleExecuteQuery}
            handleSqlChange={handleSqlChange}
            handleEditorDatabaseChange={handleEditorDatabaseChange}
            handlePageChange={handlePageChange}
            handlePageSizeChange={handlePageSizeChange}
            handleSortChange={handleSortChange}
            handleFilterChange={handleFilterChange}
            handleTableRefresh={handleTableRefresh}
            handleOpenTableDDL={handleOpenTableDDL}
            handleOpenERDiagram={handleOpenERDiagram}
            handleCreateQuery={handleCreateQuery}
            handleCloseTab={handleCloseTab}
            handleCreateTableSuccess={handleCreateTableSuccess}
            handleAlterTableSuccess={handleAlterTableSuccess}
            handleOpenRedisConsole={handleOpenRedisConsole}
            notifyRedisRefresh={notifyRedisRefresh}
            setQueriesLastUpdated={setQueriesLastUpdated}
            setTabs={setTabs}
            isDefaultQueryTitle={isDefaultQueryTitle}
            showColumnComments={showColumnComments}
            showRowNumbers={showRowNumbers}
            showZebraStripes={showZebraStripes}
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
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
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

export type { TabItem } from "@/types/tab";
