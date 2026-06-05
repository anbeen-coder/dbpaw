import { lazy, Suspense, type ComponentType } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TableView } from "@/components/business/DataGrid/TableView";
import { TableMetadataView } from "@/components/business/Metadata/TableMetadataView";
import { RoutineMetadataView } from "@/components/business/Metadata/RoutineMetadataView";
import { FileCode } from "lucide-react";
import { isMysqlFamilyDriver } from "@/lib/driver-registry";
import { api } from "@/services/api";
import { useTranslation } from "react-i18next";
import type { TabItem } from "@/types/tab";
import {
  TabActionsProvider,
  useEditorActions,
  useTableActions,
  useRedisActions,
  useSchemaActions,
  useTabActions,
} from "./tab-contexts";

const SqlEditor = lazy(async () => {
  const mod = await import("@/components/business/Editor/SqlEditor");
  return { default: mod.SqlEditor };
});

const CreateTableView = lazy(async () => {
  const mod = await import("@/components/business/CreateTable/CreateTableView");
  return { default: mod.CreateTableView };
});

const AlterTableView = lazy(async () => {
  const mod = await import("@/components/business/CreateTable/AlterTableView");
  return { default: mod.AlterTableView };
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
  const mod =
    await import("@/components/business/Elasticsearch/ElasticsearchIndexView");
  return { default: mod.ElasticsearchIndexView };
});

const ERDiagramView = lazy(async () => {
  const mod = await import("@/components/business/ERDiagram/ERDiagramView");
  return { default: mod.default };
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

function resolveTableSchema(
  driver: string,
  database: string,
  schema?: string,
): string {
  if (isMysqlFamilyDriver(driver as any) || driver === "clickhouse") {
    return database;
  }
  if (driver === "mssql") {
    return schema || "dbo";
  }
  if (driver === "duckdb") {
    return "main";
  }
  return schema || "public";
}

export interface TabContentRendererProps {
  tabs: TabItem[];
  activeTab: string;
  handleExecuteQuery: (tabId: string, sql: string) => Promise<void>;
  handleSqlChange: (tabId: string, sql: string) => void;
  handleEditorDatabaseChange: (
    tabId: string,
    database: string,
  ) => Promise<void>;
  handlePageChange: (tabId: string, page: number) => Promise<void>;
  handlePageSizeChange: (tabId: string, pageSize: number) => Promise<void>;
  handleSortChange: (
    tabId: string,
    column: string,
    direction: "asc" | "desc",
  ) => Promise<void>;
  handleFilterChange: (
    tabId: string,
    filter: string,
    orderBy: string,
  ) => Promise<void>;
  handleTableRefresh: (tabId: string, overrides?: any) => Promise<void>;
  handleOpenTableDDL: (ctx: any) => void;
  handleOpenERDiagram: (ctx?: any) => void;
  handleCreateQuery: (
    connectionId: number,
    databaseName: string,
    driver: string,
  ) => void;
  handleCloseTab: (tabId: string) => void;
  handleCreateTableSuccess: (
    tabId: string,
    connectionId: number,
    database: string,
    schema: string | undefined,
    tableName: string,
    driver: string,
  ) => void;
  handleAlterTableSuccess: (tabId: string) => void;
  handleOpenRedisConsole: (
    connection: string,
    database: string,
    connectionId: number,
    driver: string,
  ) => void;
  notifyRedisRefresh: (connectionId: number, database: string) => void;
  setQueriesLastUpdated: (timestamp: number) => void;
  setTabs: React.Dispatch<React.SetStateAction<TabItem[]>>;
  isDefaultQueryTitle: (title?: string) => boolean;
  showColumnComments: boolean;
  showRowNumbers: boolean;
  showZebraStripes: boolean;
}

function EditorTab({ tab }: { tab: TabItem }) {
  const { t } = useTranslation();
  const {
    handleExecuteQuery,
    handleSqlChange,
    handleEditorDatabaseChange,
    setQueriesLastUpdated,
    setTabs,
    isDefaultQueryTitle,
  } = useEditorActions();
  return (
    <Suspense fallback={<LazyPanelFallback label={t("common.loading")} />}>
      <SqlEditor
        databaseName={tab.database}
        availableDatabases={tab.availableDatabases}
        onExecute={(sql) => handleExecuteQuery(tab.id, sql)}
        onCancel={() =>
          tab.connectionId && tab.activeQueryId
            ? api.query.cancel(String(tab.connectionId), tab.activeQueryId)
            : Promise.resolve(false)
        }
        isExecuting={!!tab.activeQueryId}
        queryResults={tab.queryResults}
        value={tab.sqlContent}
        onChange={(sql) => handleSqlChange(tab.id, sql)}
        onDatabaseChange={(database) =>
          void handleEditorDatabaseChange(tab.id, database)
        }
        connectionId={tab.connectionId}
        driver={tab.driver}
        schemaOverview={tab.schemaOverview}
        savedQueryId={tab.savedQueryId}
        initialName={isDefaultQueryTitle(tab.title) ? "" : tab.title}
        initialDescription={tab.savedQueryDescription}
        onSaveSuccess={(savedQuery) => {
          setQueriesLastUpdated(Date.now());
          setTabs((prev) =>
            prev.map((t) => {
              if (t.id === tab.id) {
                return {
                  ...t,
                  savedQueryId: savedQuery.id,
                  title: savedQuery.name,
                  savedQueryDescription: savedQuery.description || undefined,
                  sqlContent: savedQuery.query,
                  lastSavedSql: savedQuery.query,
                  isDirty: false,
                };
              }
              return t;
            }),
          );
        }}
      />
    </Suspense>
  );
}

function TableTab({ tab }: { tab: TabItem }) {
  const {
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleFilterChange,
    handleTableRefresh,
    handleOpenTableDDL,
    handleOpenERDiagram,
    handleCreateQuery,
    showColumnComments,
    showRowNumbers,
    showZebraStripes,
  } = useTableActions();
  return (
    <TableView
      isLoading={tab.isLoading}
      data={tab.data}
      columns={tab.columns}
      total={tab.total}
      page={tab.page}
      pageSize={tab.pageSize}
      executionTimeMs={tab.executionTimeMs}
      onPageChange={(p) => handlePageChange(tab.id, p)}
      onPageSizeChange={(size) => handlePageSizeChange(tab.id, size)}
      sortColumn={tab.sortColumn}
      sortDirection={tab.sortDirection}
      onSortChange={(col, dir) => handleSortChange(tab.id, col, dir)}
      filter={tab.filter}
      orderBy={tab.orderBy}
      onFilterChange={(f, ob) => handleFilterChange(tab.id, f, ob)}
      onOpenDDL={handleOpenTableDDL}
      onOpenERDiagram={(ctx) => {
        handleOpenERDiagram({
          connectionId: ctx.connectionId,
          database: ctx.database,
        });
      }}
      onDataRefresh={(params) => handleTableRefresh(tab.id, params)}
      onCreateQuery={handleCreateQuery}
      tableContext={
        tab.connectionId && tab.database && tab.tableName && tab.driver
          ? {
              connectionId: tab.connectionId,
              database: tab.database,
              schema: resolveTableSchema(tab.driver, tab.database, tab.schema),
              table: tab.tableName,
              driver: tab.driver,
            }
          : undefined
      }
      showColumnComments={showColumnComments}
      showRowNumbers={showRowNumbers}
      showZebraStripes={showZebraStripes}
    />
  );
}

function RedisKeyTab({ tab }: { tab: TabItem }) {
  const { setTabs, handleCloseTab } = useTabActions();
  const { notifyRedisRefresh } = useRedisActions();
  if (
    tab.connectionId === undefined ||
    !tab.database ||
    tab.redisKey === undefined
  ) {
    return null;
  }
  return (
    <Suspense fallback={<LazyPanelFallback label="Loading Redis key..." />}>
      <RedisKeyView
        connectionId={tab.connectionId}
        database={tab.database}
        redisKey={tab.redisKey}
        onSavedKeyChange={(key) => {
          setTabs((prev) =>
            prev.map((item) =>
              item.id === tab.id
                ? { ...item, title: key, redisKey: key }
                : item,
            ),
          );
          notifyRedisRefresh(tab.connectionId!, tab.database!);
        }}
        onDeleted={() => {
          handleCloseTab(tab.id);
          notifyRedisRefresh(tab.connectionId!, tab.database!);
        }}
      />
    </Suspense>
  );
}

function RedisConsoleTab({ tab }: { tab: TabItem }) {
  if (tab.connectionId === undefined || !tab.database) return null;
  return (
    <Suspense fallback={<LazyPanelFallback label="Loading Redis Console..." />}>
      <RedisConsole connectionId={tab.connectionId} database={tab.database} />
    </Suspense>
  );
}

function RedisBrowserTab({ tab }: { tab: TabItem }) {
  const { handleOpenRedisConsole } = useRedisActions();
  if (tab.connectionId === undefined || !tab.database) return null;
  return (
    <Suspense fallback={<LazyPanelFallback label="Loading Redis Browser..." />}>
      <RedisBrowserView
        connectionId={tab.connectionId}
        database={tab.database}
        onOpenConsole={() =>
          handleOpenRedisConsole(
            tab.connection!,
            tab.database!,
            tab.connectionId!,
            tab.driver!,
          )
        }
      />
    </Suspense>
  );
}

function RedisServerInfoTab({ tab }: { tab: TabItem }) {
  if (tab.connectionId === undefined || !tab.database) return null;
  return (
    <Suspense fallback={<LazyPanelFallback label="Loading Server Info..." />}>
      <RedisServerInfoView
        connectionId={tab.connectionId}
        database={tab.database}
      />
    </Suspense>
  );
}

function ElasticsearchIndexTab({ tab }: { tab: TabItem }) {
  if (tab.connectionId === undefined || !tab.elasticsearchIndex) return null;
  return (
    <Suspense
      fallback={<LazyPanelFallback label="Loading Elasticsearch index..." />}
    >
      <ElasticsearchIndexView
        connectionId={tab.connectionId}
        index={tab.elasticsearchIndex}
      />
    </Suspense>
  );
}

function ERDiagramTab({ tab }: { tab: TabItem }) {
  const { t } = useTranslation();
  if (tab.connectionId === undefined) return null;
  return (
    <Suspense fallback={<LazyPanelFallback label={t("erDiagram.loading")} />}>
      <ERDiagramView
        connectionId={tab.connectionId}
        database={tab.database}
        schema={tab.schema}
      />
    </Suspense>
  );
}

function CreateTableTab({ tab }: { tab: TabItem }) {
  const { t } = useTranslation();
  const { handleCreateTableSuccess } = useSchemaActions();
  const { handleCloseTab } = useTabActions();
  if (tab.connectionId === undefined || !tab.database || !tab.driver)
    return null;
  return (
    <Suspense fallback={<LazyPanelFallback label={t("common.loading")} />}>
      <CreateTableView
        connectionId={tab.connectionId}
        database={tab.database}
        schema={tab.schema ?? ""}
        driver={tab.driver}
        onSuccess={(tableName) =>
          handleCreateTableSuccess(
            tab.id,
            tab.connectionId!,
            tab.database!,
            tab.schema,
            tableName,
            tab.driver!,
          )
        }
        onCancel={() => handleCloseTab(tab.id)}
      />
    </Suspense>
  );
}

function AlterTableTab({ tab }: { tab: TabItem }) {
  const { t } = useTranslation();
  const { handleAlterTableSuccess } = useSchemaActions();
  const { handleCloseTab } = useTabActions();
  if (
    tab.connectionId === undefined ||
    !tab.database ||
    !tab.tableName ||
    !tab.driver
  )
    return null;
  return (
    <Suspense fallback={<LazyPanelFallback label={t("common.loading")} />}>
      <AlterTableView
        connectionId={tab.connectionId}
        database={tab.database}
        schema={tab.schema ?? ""}
        table={tab.tableName}
        driver={tab.driver}
        onSuccess={() => handleAlterTableSuccess(tab.id)}
        onCancel={() => handleCloseTab(tab.id)}
      />
    </Suspense>
  );
}

function RoutineTab({ tab }: { tab: TabItem }) {
  if (
    tab.connectionId === undefined ||
    !tab.database ||
    !tab.schema ||
    !tab.routineName ||
    !tab.routineType
  ) {
    return null;
  }
  return (
    <RoutineMetadataView
      connectionId={tab.connectionId}
      database={tab.database}
      schema={tab.schema}
      name={tab.routineName}
      routineType={tab.routineType}
    />
  );
}

function MetadataFallbackTab({ tab }: { tab: TabItem }) {
  if (!tab.connectionId || !tab.database || !tab.schema || !tab.tableName)
    return null;
  return (
    <TableMetadataView
      connectionId={tab.connectionId}
      database={tab.database}
      schema={tab.schema}
      table={tab.tableName}
    />
  );
}

type TabRenderer = ComponentType<{ tab: TabItem }>;

const TAB_RENDERERS: Record<TabItem["type"], TabRenderer> = {
  editor: EditorTab,
  table: TableTab,
  routine: RoutineTab,
  "redis-key": RedisKeyTab,
  "redis-console": RedisConsoleTab,
  "redis-browser": RedisBrowserTab,
  "redis-server-info": RedisServerInfoTab,
  "elasticsearch-index": ElasticsearchIndexTab,
  "er-diagram": ERDiagramTab,
  "create-table": CreateTableTab,
  "alter-table": AlterTableTab,
  ddl: MetadataFallbackTab,
};

export function TabContentRenderer({
  tabs,
  activeTab: _activeTab,
  ...rest
}: TabContentRendererProps) {
  const { t } = useTranslation();
  const props = {
    tabs,
    activeTab: _activeTab,
    ...rest,
  } as TabContentRendererProps;

  return (
    <TabActionsProvider
      handleExecuteQuery={props.handleExecuteQuery}
      handleSqlChange={props.handleSqlChange}
      handleEditorDatabaseChange={props.handleEditorDatabaseChange}
      handlePageChange={props.handlePageChange}
      handlePageSizeChange={props.handlePageSizeChange}
      handleSortChange={props.handleSortChange}
      handleFilterChange={props.handleFilterChange}
      handleTableRefresh={props.handleTableRefresh}
      handleOpenTableDDL={props.handleOpenTableDDL}
      handleOpenERDiagram={props.handleOpenERDiagram}
      handleCreateQuery={props.handleCreateQuery}
      handleCloseTab={props.handleCloseTab}
      handleCreateTableSuccess={props.handleCreateTableSuccess}
      handleAlterTableSuccess={props.handleAlterTableSuccess}
      handleOpenRedisConsole={props.handleOpenRedisConsole}
      notifyRedisRefresh={props.notifyRedisRefresh}
      setQueriesLastUpdated={props.setQueriesLastUpdated}
      setTabs={props.setTabs}
      isDefaultQueryTitle={props.isDefaultQueryTitle}
      showColumnComments={props.showColumnComments}
      showRowNumbers={props.showRowNumbers}
      showZebraStripes={props.showZebraStripes}
    >
      {tabs.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t("app.empty.hint")}</p>
          </div>
        </div>
      ) : (
        <>
          {tabs.map((tab) => {
            const Renderer = TAB_RENDERERS[tab.type] ?? MetadataFallbackTab;
            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                forceMount
                className="h-full m-0"
              >
                <ErrorBoundary>
                  <Renderer tab={tab} />
                </ErrorBoundary>
              </TabsContent>
            );
          })}
        </>
      )}
    </TabActionsProvider>
  );
}
