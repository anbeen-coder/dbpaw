# ConnectionList 子组件拆分实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ConnectionList.tsx 从 1382 行缩减到 ~300 行，提取 4 个纯渲染子组件。

**Architecture:** 状态和 hooks 保留在 ConnectionList，子组件只负责渲染。4 个新文件：SidebarSearch、SidebarHeader、ConnectionTreeContent、ConnectionTreeDialogs。

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react

---

## 文件映射

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/business/Sidebar/connection-list/SidebarSearch.tsx` | 新增 | 搜索输入框 |
| `src/components/business/Sidebar/connection-list/SidebarHeader.tsx` | 新增 | 标题栏 + 按钮 + 对话框触发 |
| `src/components/business/Sidebar/connection-list/ConnectionTreeContent.tsx` | 新增 | 连接树渲染 |
| `src/components/business/Sidebar/connection-list/ConnectionTreeDialogs.tsx` | 新增 | 所有对话框包裹 |
| `src/components/business/Sidebar/ConnectionList.tsx` | 修改 | 使用新子组件 |

---

### Task 1: SidebarSearch

**Files:**
- Create: `src/components/business/Sidebar/connection-list/SidebarSearch.tsx`

- [ ] **Step 1: 创建 SidebarSearch.tsx**

```tsx
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface SidebarSearchProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

export function SidebarSearch({ searchTerm, onSearchTermChange }: SidebarSearchProps) {
  const { t } = useTranslation();

  return (
    <div className="p-2 border-b border-border">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("connection.searchTables")}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证类型**

Run: `npx tsc --noEmit --pretty`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Sidebar/connection-list/SidebarSearch.tsx
git commit -m "refactor: extract SidebarSearch from ConnectionList"
```

---

### Task 2: SidebarHeader

**Files:**
- Create: `src/components/business/Sidebar/connection-list/SidebarHeader.tsx`

- [ ] **Step 1: 创建 SidebarHeader.tsx**

```tsx
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ConnectionDialog } from "./ConnectionDialog";
import { ImportDialog } from "../ImportDialog";
import type { ConnectionForm, Driver } from "@/services/api";

interface SidebarHeaderProps {
  isLoadingConnections: boolean;
  isLoadingQueries: boolean;
  onRefresh: () => void;
  // ConnectionDialog
  isDialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  dialogMode: "create" | "edit";
  createStep: "type" | "form";
  form: ConnectionForm;
  setForm: (form: ConnectionForm) => void;
  validationMsg: string | null;
  testMsg: string | null;
  requiredOk: boolean;
  isTesting: boolean;
  isConnecting: boolean;
  isSavingEdit: boolean;
  onSubmit: () => void;
  onClose: () => void;
  onTestConnection: () => void;
  onCreateDriverSelect: (driver: Driver) => void;
  onBackToType: () => void;
  onPickSslCaCertFile: () => void;
  onPickSshKeyFile: () => void;
  onPickDatabaseFile: (driver: Driver) => void;
  openCreateDialog: () => void;
  // ImportDialog
  isImportDialogOpen: boolean;
  onImportDialogOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function SidebarHeader({
  isLoadingConnections,
  isLoadingQueries,
  onRefresh,
  isDialogOpen,
  onDialogOpenChange,
  dialogMode,
  createStep,
  form,
  setForm,
  validationMsg,
  testMsg,
  requiredOk,
  isTesting,
  isConnecting,
  isSavingEdit,
  onSubmit,
  onClose,
  onTestConnection,
  onCreateDriverSelect,
  onBackToType,
  onPickSslCaCertFile,
  onPickSshKeyFile,
  onPickDatabaseFile,
  openCreateDialog,
  isImportDialogOpen,
  onImportDialogOpenChange,
  onImported,
}: SidebarHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="px-2 py-1 border-b border-border flex items-center justify-between h-8">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-sm">{t("connection.title")}</h2>
        {isLoadingQueries && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onRefresh}
          loading={isLoadingConnections}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <ConnectionDialog
          open={isDialogOpen}
          onOpenChange={onDialogOpenChange}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={openCreateDialog}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          }
          dialogMode={dialogMode}
          createStep={createStep}
          form={form}
          setForm={setForm}
          validationMsg={validationMsg}
          testMsg={testMsg}
          requiredOk={requiredOk}
          isTesting={isTesting}
          isConnecting={isConnecting}
          isSavingEdit={isSavingEdit}
          onSubmit={onSubmit}
          onClose={onClose}
          onTestConnection={onTestConnection}
          onCreateDriverSelect={onCreateDriverSelect}
          onBackToType={onBackToType}
          onPickSslCaCertFile={onPickSslCaCertFile}
          onPickSshKeyFile={onPickSshKeyFile}
          onPickDatabaseFile={onPickDatabaseFile}
        />
        <ImportDialog
          open={isImportDialogOpen}
          onOpenChange={onImportDialogOpenChange}
          onImported={onImported}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证类型**

Run: `npx tsc --noEmit --pretty`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Sidebar/connection-list/SidebarHeader.tsx
git commit -m "refactor: extract SidebarHeader from ConnectionList"
```

---

### Task 3: ConnectionTreeContent

**Files:**
- Create: `src/components/business/Sidebar/connection-list/ConnectionTreeContent.tsx`

- [ ] **Step 1: 创建 ConnectionTreeContent.tsx**

这是最大的子组件，包含连接树的完整渲染逻辑。

```tsx
import { Database, FileCode, FolderOpen, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DatabaseGroupConfig } from "@/lib/tree-adapters/types";
import { getConnectionIcon, supportsSchemaBrowsing } from "@/lib/driver-registry";
import { TreeNode } from "./TreeNode";
import { GroupNodeRenderer, type TreeNodeDeps } from "./TreeNodeRenderers";
import type {
  Connection,
  DatabaseInfo,
  SchemaInfo,
  TableInfo,
  DatasourceTreeAdapter,
  SelectedTableNode,
} from "./types";
import type { SavedQuery } from "@/services/api";
import { ConnectionContextMenu } from "../ConnectionContextMenu";
import { InlineContextMenu, type ContextMenuState } from "./InlineContextMenu";
import { renderConnectionStatusIndicator } from "./helpers";

interface ConnectionTreeContentProps {
  // 数据
  connections: Connection[];
  filteredConnections: Connection[];
  savedQueriesByConnection: Record<string, SavedQuery[]>;
  searchTerm: string;
  // 展开状态
  expandedConnections: Set<string>;
  expandedDatabases: Set<string>;
  expandedSchemas: Set<string>;
  expandedTables: Set<string>;
  expandedGroupNodes: Set<string>;
  expandedQueryGroups: Set<string>;
  expandedDatabaseGroups: Set<string>;
  // Loading 状态
  loadingDatabaseKeys: Set<string>;
  loadingTableKeys: Set<string>;
  // 选中状态
  selectedTableKey: string | null;
  tableNodeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  // 切换回调
  toggleConnection: (id: string, connections: Connection[]) => void;
  toggleDatabase: (key: string, onNeedsLoading?: (connId: string, dbName: string, key: string) => void) => void;
  toggleSchema: (key: string) => void;
  toggleTable: (key: string, onNeedsLoading?: () => void) => void;
  toggleGroupNode: (key: string) => void;
  toggleQueryGroup: (key: string) => void;
  toggleDatabaseGroup: (key: string) => void;
  // 数据加载回调
  connectConnection: (id: string) => void;
  fetchAndSetTables: (connectionId: string, databaseName: string) => Promise<TableInfo[]>;
  setLoadingDatabaseKeys: (fn: (prev: Set<string>) => Set<string>) => void;
  // 适配器
  getAdapter: (connection: Connection) => DatasourceTreeAdapter;
  treeNodeDeps: TreeNodeDeps;
  // 配置
  showSavedQueriesInTree: boolean;
  simpleMode: boolean;
  // 回调
  onContextMenuChange: (menu: ContextMenuState) => void;
  onSelectSavedQuery?: (query: SavedQuery) => void;
  // Database group helpers
  getGroupItems: (database: DatabaseInfo, group: DatabaseGroupConfig, dbKey: string, schema?: SchemaInfo) => { name: string; [key: string]: any }[];
  // Context menu state
  contextMenu: ContextMenuState;
  contextMenuConnection: Connection | null | undefined;
  contextMenuDatabaseAdapter: DatasourceTreeAdapter | null;
  // Context menu actions
  onNewConnection: () => void;
  onImportConnection: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReconnect: (id: string) => void;
  onCreateQuery: (connectionId: string | null | undefined, databaseName?: string | null) => void;
  onCreateDatabase: (id: string) => void;
  onDelete: (id: string | null) => void;
  supportsCreateDatabaseForDriver: (driver: string) => boolean;
  onRefreshDatabaseTables: (connectionId: string, databaseName: string) => void;
  onDatabaseImport: (connectionId: string, databaseName: string) => void;
  onDatabaseExport: (connection: Connection, database: DatabaseInfo) => void;
  onCreateTable?: (connectionId: number, database: string, schema: string, driver: string) => void;
}

const loadingSpinner = (
  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
);

export function ConnectionTreeContent(props: ConnectionTreeContentProps) {
  const { t } = useTranslation();
  const {
    connections,
    filteredConnections,
    savedQueriesByConnection,
    searchTerm,
    expandedConnections,
    expandedDatabases,
    expandedSchemas,
    expandedTables,
    expandedGroupNodes,
    expandedQueryGroups,
    expandedDatabaseGroups,
    loadingDatabaseKeys,
    loadingTableKeys,
    selectedTableKey,
    tableNodeRefs,
    toggleConnection,
    toggleDatabase,
    toggleSchema,
    toggleTable,
    toggleGroupNode,
    toggleQueryGroup,
    toggleDatabaseGroup,
    connectConnection,
    fetchAndSetTables,
    setLoadingDatabaseKeys,
    getAdapter,
    treeNodeDeps,
    showSavedQueriesInTree,
    simpleMode,
    onContextMenuChange,
    onSelectSavedQuery,
    getGroupItems,
    contextMenu,
    contextMenuConnection,
    contextMenuDatabaseAdapter,
    onNewConnection,
    onImportConnection,
    onEdit,
    onDuplicate,
    onReconnect,
    onCreateQuery,
    onCreateDatabase,
    onDelete,
    supportsCreateDatabaseForDriver,
    onRefreshDatabaseTables,
    onDatabaseImport,
    onDatabaseExport,
    onCreateTable,
  } = props;

  const supportsSchemaNodeForDriver = (driver: string) =>
    supportsSchemaBrowsing(driver as any);

  const getSchemaNodeKey = (databaseKey: string, schema: string) =>
    `${databaseKey}::${schema}`;

  const getConnectionStatusLabel = (connection: Connection) => {
    if (connection.connectState === "success") {
      return t("connection.status.connected");
    }
    if (connection.connectState === "error") {
      if (connection.connectError) {
        return t("connection.status.failedWithReason", {
          error: connection.connectError,
        });
      }
      return t("connection.status.failed");
    }
    if (connection.connectState === "connecting") {
      return t("connection.status.connecting");
    }
    return t("connection.status.idle");
  };

  const renderDatabaseTreeNode = (
    connection: Connection,
    database: DatabaseInfo,
    level: number,
  ) => {
    const dbKey = `${connection.id}-${database.name}`;
    const datasourceAdapter = getAdapter(connection);

    return (
      <TreeNode
        key={dbKey}
        level={level}
        icon={<Database className="w-4 w-4" />}
        label={
          <>
            {(connection.type === "sqlite" || connection.type === "duckdb") &&
            database.name === "main"
              ? t(
                  connection.type === "duckdb"
                    ? "connection.duckdbMainLabel"
                    : "connection.sqliteMainLabel",
                )
              : database.name}
            {connection.type === "redis" && database.redisKeyCount != null && (
              <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                · {database.redisKeyCount.toLocaleString()}
              </span>
            )}
          </>
        }
        isExpanded={
          datasourceAdapter.isDatabaseExpandable
            ? expandedDatabases.has(dbKey)
            : false
        }
        onToggle={() =>
          toggleDatabase(dbKey, (connId, dbName, key) => {
            const conn = connections.find((c) => c.id === connId);
            if (conn) {
              const db = conn.databases.find((d) => d.name === dbName);
              if (
                db &&
                (supportsSchemaNodeForDriver(conn.type)
                  ? db.schemas.length === 0
                  : db.tables.length === 0)
              ) {
                setLoadingDatabaseKeys((prev) => new Set(prev).add(key));
                fetchAndSetTables(connId, dbName).finally(() => {
                  setLoadingDatabaseKeys((prev) => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                  });
                });
              }
            }
          })
        }
        toggleOnRowClick={datasourceAdapter.isDatabaseExpandable}
        hideToggle={!datasourceAdapter.isDatabaseExpandable}
        statusIndicator={
          loadingDatabaseKeys.has(dbKey) ? loadingSpinner : undefined
        }
        actions={datasourceAdapter.getDatabaseRowActions(database)}
        onDoubleClick={
          datasourceAdapter.onDatabaseDoubleClick
            ? () => datasourceAdapter.onDatabaseDoubleClick?.(database)
            : undefined
        }
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenuChange({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            connectionId: connection.id,
            databaseName: database.name,
            type: "database",
          });
        }}
      >
        {(() => {
          const allGroups = datasourceAdapter.databaseGroups || [];
          const dbGroups = simpleMode
            ? allGroups.filter((g) => g.source === "tables" && !g.sourceFilter)
            : allGroups;
          return datasourceAdapter.supportsSchemaNode ? (
            database.schemas.map((schemaNode) => {
              const schemaKey = getSchemaNodeKey(dbKey, schemaNode.name);
              return (
                <TreeNode
                  key={schemaKey}
                  level={level + 1}
                  icon={<FolderOpen className="w-4 h-4" />}
                  label={schemaNode.name}
                  isExpanded={expandedSchemas.has(schemaKey)}
                  onToggle={() => toggleSchema(schemaKey)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenuChange({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      connectionId: connection.id,
                      databaseName: database.name,
                      schemaName: schemaNode.name,
                      type: "schema",
                    });
                  }}
                >
                  {dbGroups.map((group) => {
                    const items = getGroupItems(database, group, dbKey, schemaNode);
                    return (
                      <GroupNodeRenderer
                        key={`${dbKey}::${group.id}`}
                        group={group}
                        items={items}
                        groupLevel={level + 2}
                        dbKey={dbKey}
                        connection={connection}
                        database={database}
                        deps={treeNodeDeps}
                      />
                    );
                  })}
                </TreeNode>
              );
            })
          ) : (
            <>
              {dbGroups.map((group) => {
                const items = getGroupItems(database, group, dbKey);
                return (
                  <GroupNodeRenderer
                    key={`${dbKey}::${group.id}`}
                    group={group}
                    items={items}
                    groupLevel={level + 1}
                    dbKey={dbKey}
                    connection={connection}
                    database={database}
                    deps={treeNodeDeps}
                  />
                );
              })}
              {datasourceAdapter.renderDatabaseFooter(database, level)}
            </>
          );
        })()}
      </TreeNode>
    );
  };

  return (
    <ConnectionContextMenu
      onNewConnection={onNewConnection}
      onImportConnection={onImportConnection}
    >
      {({ onContextMenu }) => (
        <div
          className="flex-1 overflow-auto"
          onClick={() =>
            onContextMenuChange((prev) => ({ ...prev, visible: false }))
          }
          onContextMenu={onContextMenu}
        >
          {filteredConnections.map((connection) => {
            const datasourceAdapter = getAdapter(connection);
            const queriesForConnection = (
              savedQueriesByConnection[connection.id] || []
            ).filter((query) =>
              query.name.toLowerCase().includes(searchTerm.toLowerCase()),
            );
            const visibleDatabases = connection.databases.filter(
              (database) =>
                !["information_schema", "performance_schema"].includes(
                  database.name.toLowerCase(),
                ),
            );

            return (
              <TreeNode
                key={connection.id}
                level={0}
                icon={getConnectionIcon(connection.type)}
                label={connection.name}
                isExpanded={expandedConnections.has(connection.id)}
                toggleOnRowClick={connection.connectState === "success"}
                onToggle={() => toggleConnection(connection.id, connections)}
                onDoubleClick={() => {
                  void connectConnection(connection.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenuChange({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    connectionId: connection.id,
                    type: "connection",
                  });
                }}
                leadingIndicator={
                  <span
                    className="inline-flex items-center justify-center shrink-0"
                    role="status"
                    aria-label={getConnectionStatusLabel(connection)}
                    title={getConnectionStatusLabel(connection)}
                  >
                    {renderConnectionStatusIndicator(connection)}
                  </span>
                }
              >
                <>
                  {showSavedQueriesInTree ? (
                    <TreeNode
                      level={1}
                      icon={<FileCode className="w-4 h-4" />}
                      label={t("connection.tree.queries")}
                      isExpanded={expandedQueryGroups.has(
                        `${connection.id}::queries`,
                      )}
                      onToggle={() =>
                        toggleQueryGroup(`${connection.id}::queries`)
                      }
                      forceShowToggle={queriesForConnection.length > 0}
                      canToggle={queriesForConnection.length > 0}
                    >
                      {queriesForConnection.map((query) => (
                        <TreeNode
                          key={`conn-query-${query.id}`}
                          level={2}
                          icon={<FileCode className="w-4 h-4" />}
                          label={query.name}
                          toggleOnRowClick={false}
                          canToggle={false}
                          onDoubleClick={() => onSelectSavedQuery?.(query)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          {null}
                        </TreeNode>
                      ))}
                    </TreeNode>
                  ) : null}

                  {connection.connectState === "success" ? (
                    showSavedQueriesInTree ? (
                      <TreeNode
                        level={1}
                        icon={<Database className="w-4 h-4" />}
                        label={t("connection.tree.database")}
                        isExpanded={expandedDatabaseGroups.has(
                          `${connection.id}::databases`,
                        )}
                        onToggle={() =>
                          toggleDatabaseGroup(`${connection.id}::databases`)
                        }
                        forceShowToggle={visibleDatabases.length > 0}
                        canToggle={visibleDatabases.length > 0}
                      >
                        {visibleDatabases.map((database) =>
                          renderDatabaseTreeNode(connection, database, 2),
                        )}
                      </TreeNode>
                    ) : (
                      visibleDatabases.map((database) =>
                        renderDatabaseTreeNode(connection, database, 1),
                      )
                    )
                  ) : null}
                </>
              </TreeNode>
            );
          })}
        </div>
      )}
    </ConnectionContextMenu>
  );
}
```

- [ ] **Step 2: 验证类型**

Run: `npx tsc --noEmit --pretty`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Sidebar/connection-list/ConnectionTreeContent.tsx
git commit -m "refactor: extract ConnectionTreeContent from ConnectionList"
```

---

### Task 4: ConnectionTreeDialogs

**Files:**
- Create: `src/components/business/Sidebar/connection-list/ConnectionTreeDialogs.tsx`

- [ ] **Step 1: 创建 ConnectionTreeDialogs.tsx**

```tsx
import { InlineContextMenu, type ContextMenuState } from "./InlineContextMenu";
import { ConnectionDialogs } from "./ConnectionDialogs";
import type { Connection, DatabaseInfo, DatasourceTreeAdapter } from "./types";
import type { DatabaseExportFormat } from "./types";

interface ConnectionTreeDialogsProps {
  // InlineContextMenu
  contextMenu: ContextMenuState;
  onCloseContextMenu: () => void;
  connections: Connection[];
  contextMenuConnection: Connection | null | undefined;
  contextMenuDatabaseAdapter: DatasourceTreeAdapter | null;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReconnect: (id: string) => void;
  onCreateQuery: (connectionId: string | null | undefined, databaseName?: string | null) => void;
  onCreateDatabase: (id: string) => void;
  onDelete: (id: string | null) => void;
  supportsCreateDatabaseForDriver: (driver: string) => boolean;
  onRefreshDatabaseTables: (connectionId: string, databaseName: string) => void;
  onDatabaseImport: (connectionId: string, databaseName: string) => void;
  onDatabaseExport: (connection: Connection, database: DatabaseInfo) => void;
  onCreateTable?: (connectionId: number, database: string, schema: string, driver: string) => void;
  // ConnectionDialogs
  createEsIndexDialogOpen: boolean;
  createEsIndexConnectionId: string | null;
  onCreateEsIndexDialogOpenChange: (open: boolean) => void;
  onEsIndexCreated: () => Promise<void>;
  isCreateDbDialogOpen: boolean;
  onCloseCreateDbDialog: () => void;
  createDbForm: any;
  setCreateDbForm: (form: any) => void;
  showCreateDbAdvanced: boolean;
  setShowCreateDbAdvanced: (v: boolean | ((prev: boolean) => boolean)) => void;
  createDbValidationMsg: string | null;
  isCreatingDatabase: boolean;
  mysqlCharsets: string[];
  mysqlCollations: string[];
  loadingMysqlOptions: boolean;
  isMySqlFamilyCreateDb: boolean;
  isPostgresCreateDb: boolean;
  isMssqlCreateDb: boolean;
  onCreateDatabase: () => Promise<void>;
  deleteTargetConnectionId: string | null;
  onDeleteTargetChange: (id: string | null) => void;
  isDeleting: boolean;
  onDeleteConnection: (id: string) => Promise<void>;
  isImportConfirmOpen: boolean;
  isImportingSql: boolean;
  pendingImportDatabaseName?: string;
  pendingImportFilePath?: string;
  onConfirmImport: () => Promise<void>;
  onImportConfirmOpenChange: (open: boolean) => void;
  onClearPendingImport: () => void;
  isTableExportDialogOpen: boolean;
  isExportingTable: boolean;
  pendingTableExportTableName?: string;
  onTableExportDialogOpenChange: (open: boolean) => void;
  onClearPendingTableExport: () => void;
  tableExportFormat: "csv" | "json" | "sql_dml" | "sql_ddl" | "sql_full";
  setTableExportFormat: (format: "csv" | "json" | "sql_dml" | "sql_ddl" | "sql_full") => void;
  onTableExportConfirm: () => Promise<void>;
  isDatabaseExportDialogOpen: boolean;
  isExportingDatabaseSql: boolean;
  pendingDatabaseExportName?: string;
  pendingDatabaseExportFormat: DatabaseExportFormat;
  onDatabaseExportDialogOpenChange: (open: boolean) => void;
  onClearPendingDatabaseExport: () => void;
  onDatabaseExportFormatChange: (value: DatabaseExportFormat) => void;
  onConfirmDatabaseExport: () => Promise<void>;
}

export function ConnectionTreeDialogs({
  contextMenu,
  onCloseContextMenu,
  connections,
  contextMenuConnection,
  contextMenuDatabaseAdapter,
  onEdit,
  onDuplicate,
  onReconnect,
  onCreateQuery,
  onCreateDatabase,
  onDelete,
  supportsCreateDatabaseForDriver,
  onRefreshDatabaseTables,
  onDatabaseImport,
  onDatabaseExport,
  onCreateTable,
  createEsIndexDialogOpen,
  createEsIndexConnectionId,
  onCreateEsIndexDialogOpenChange,
  onEsIndexCreated,
  isCreateDbDialogOpen,
  onCloseCreateDbDialog,
  createDbForm,
  setCreateDbForm,
  showCreateDbAdvanced,
  setShowCreateDbAdvanced,
  createDbValidationMsg,
  isCreatingDatabase,
  mysqlCharsets,
  mysqlCollations,
  loadingMysqlOptions,
  isMySqlFamilyCreateDb,
  isPostgresCreateDb,
  isMssqlCreateDb,
  onCreateDatabase: handleCreateDatabase,
  deleteTargetConnectionId,
  onDeleteTargetChange,
  isDeleting,
  onDeleteConnection,
  isImportConfirmOpen,
  isImportingSql,
  pendingImportDatabaseName,
  pendingImportFilePath,
  onConfirmImport,
  onImportConfirmOpenChange,
  onClearPendingImport,
  isTableExportDialogOpen,
  isExportingTable,
  pendingTableExportTableName,
  onTableExportDialogOpenChange,
  onClearPendingTableExport,
  tableExportFormat,
  setTableExportFormat,
  onTableExportConfirm,
  isDatabaseExportDialogOpen,
  isExportingDatabaseSql,
  pendingDatabaseExportName,
  pendingDatabaseExportFormat,
  onDatabaseExportDialogOpenChange,
  onClearPendingDatabaseExport,
  onDatabaseExportFormatChange,
  onConfirmDatabaseExport,
}: ConnectionTreeDialogsProps) {
  return (
    <>
      <InlineContextMenu
        contextMenu={contextMenu}
        onClose={onCloseContextMenu}
        connections={connections}
        contextMenuConnection={contextMenuConnection}
        contextMenuDatabaseAdapter={contextMenuDatabaseAdapter}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onReconnect={onReconnect}
        onCreateQuery={onCreateQuery}
        onCreateDatabase={onCreateDatabase}
        onDelete={onDelete}
        supportsCreateDatabaseForDriver={supportsCreateDatabaseForDriver}
        onRefreshDatabaseTables={onRefreshDatabaseTables}
        onDatabaseImport={onDatabaseImport}
        onDatabaseExport={onDatabaseExport}
        onCreateTable={onCreateTable}
      />
      <ConnectionDialogs
        createEsIndexDialogOpen={createEsIndexDialogOpen}
        createEsIndexConnectionId={createEsIndexConnectionId}
        onCreateEsIndexDialogOpenChange={onCreateEsIndexDialogOpenChange}
        onEsIndexCreated={onEsIndexCreated}
        isCreateDbDialogOpen={isCreateDbDialogOpen}
        onCloseCreateDbDialog={onCloseCreateDbDialog}
        createDbForm={createDbForm}
        setCreateDbForm={setCreateDbForm}
        showCreateDbAdvanced={showCreateDbAdvanced}
        setShowCreateDbAdvanced={setShowCreateDbAdvanced}
        createDbValidationMsg={createDbValidationMsg}
        isCreatingDatabase={isCreatingDatabase}
        mysqlCharsets={mysqlCharsets}
        mysqlCollations={mysqlCollations}
        loadingMysqlOptions={loadingMysqlOptions}
        isMySqlFamilyCreateDb={isMySqlFamilyCreateDb}
        isPostgresCreateDb={isPostgresCreateDb}
        isMssqlCreateDb={isMssqlCreateDb}
        onCreateDatabase={handleCreateDatabase}
        deleteTargetConnectionId={deleteTargetConnectionId}
        onDeleteTargetChange={onDeleteTargetChange}
        isDeleting={isDeleting}
        onDeleteConnection={onDeleteConnection}
        isImportConfirmOpen={isImportConfirmOpen}
        isImportingSql={isImportingSql}
        pendingImportDatabaseName={pendingImportDatabaseName}
        pendingImportFilePath={pendingImportFilePath}
        onConfirmImport={onConfirmImport}
        onImportConfirmOpenChange={onImportConfirmOpenChange}
        onClearPendingImport={onClearPendingImport}
        isTableExportDialogOpen={isTableExportDialogOpen}
        isExportingTable={isExportingTable}
        pendingTableExportTableName={pendingTableExportTableName}
        onTableExportDialogOpenChange={onTableExportDialogOpenChange}
        onClearPendingTableExport={onClearPendingTableExport}
        tableExportFormat={tableExportFormat}
        setTableExportFormat={setTableExportFormat}
        onTableExportConfirm={onTableExportConfirm}
        isDatabaseExportDialogOpen={isDatabaseExportDialogOpen}
        isExportingDatabaseSql={isExportingDatabaseSql}
        pendingDatabaseExportName={pendingDatabaseExportName}
        pendingDatabaseExportFormat={pendingDatabaseExportFormat}
        onDatabaseExportDialogOpenChange={onDatabaseExportDialogOpenChange}
        onClearPendingDatabaseExport={onClearPendingDatabaseExport}
        onDatabaseExportFormatChange={onDatabaseExportFormatChange}
        onConfirmDatabaseExport={onConfirmDatabaseExport}
      />
    </>
  );
}
```

- [ ] **Step 2: 验证类型**

Run: `npx tsc --noEmit --pretty`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Sidebar/connection-list/ConnectionTreeDialogs.tsx
git commit -m "refactor: extract ConnectionTreeDialogs from ConnectionList"
```

---

### Task 5: 更新 ConnectionList.tsx 使用新子组件

**Files:**
- Modify: `src/components/business/Sidebar/ConnectionList.tsx`

- [ ] **Step 1: 添加新子组件导入**

在 ConnectionList.tsx 的 import 区域添加：

```tsx
import { SidebarHeader } from "./connection-list/SidebarHeader";
import { SidebarSearch } from "./connection-list/SidebarSearch";
import { ConnectionTreeContent } from "./connection-list/ConnectionTreeContent";
import { ConnectionTreeDialogs } from "./connection-list/ConnectionTreeDialogs";
```

- [ ] **Step 2: 替换渲染 JSX**

将 `return` 语句中的 JSX 替换为使用新子组件。保留所有 hooks、state、callbacks、effects 不变。

新的 return 块大致为：

```tsx
return (
  <div className="h-full flex flex-col bg-background border-r border-border">
    <SidebarHeader
      isLoadingConnections={isLoadingConnections}
      isLoadingQueries={isLoadingQueries}
      onRefresh={fetchConnections}
      isDialogOpen={isDialogOpen}
      onDialogOpenChange={(open) => {
        if (!open) {
          closeConnectionDialog();
          return;
        }
        setIsDialogOpen(true);
      }}
      dialogMode={dialogMode}
      createStep={createStep}
      form={form}
      setForm={setForm}
      validationMsg={validationMsg}
      testMsg={testMsg}
      requiredOk={requiredOk}
      isTesting={isTesting}
      isConnecting={isConnecting}
      isSavingEdit={isSavingEdit}
      onSubmit={handleDialogSubmit}
      onClose={closeConnectionDialog}
      onTestConnection={handleTestConnection}
      onCreateDriverSelect={handleCreateDriverSelect}
      onBackToType={() => setCreateStep("type")}
      onPickSslCaCertFile={() => void handlePickSslCaCertFile()}
      onPickSshKeyFile={() => void handlePickSshKeyFile()}
      onPickDatabaseFile={(driver) => void handlePickDatabaseFile(driver)}
      openCreateDialog={openCreateDialog}
      isImportDialogOpen={isImportDialogOpen}
      onImportDialogOpenChange={setIsImportDialogOpen}
      onImported={fetchConnections}
    />
    <SidebarSearch
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
    />
    <ConnectionTreeContent
      connections={connections}
      filteredConnections={filteredConnections}
      savedQueriesByConnection={savedQueriesByConnection}
      searchTerm={searchTerm}
      expandedConnections={expandedConnections}
      expandedDatabases={expandedDatabases}
      expandedSchemas={expandedSchemas}
      expandedTables={expandedTables}
      expandedGroupNodes={expandedGroupNodes}
      expandedQueryGroups={expandedQueryGroups}
      expandedDatabaseGroups={expandedDatabaseGroups}
      loadingDatabaseKeys={loadingDatabaseKeys}
      loadingTableKeys={loadingTableKeys}
      selectedTableKey={selectedTableKey}
      tableNodeRefs={tableNodeRefs}
      toggleConnection={toggleConnection}
      toggleDatabase={toggleDatabase}
      toggleSchema={toggleSchema}
      toggleTable={toggleTable}
      toggleGroupNode={toggleGroupNode}
      toggleQueryGroup={toggleQueryGroup}
      toggleDatabaseGroup={toggleDatabaseGroup}
      connectConnection={connectConnection}
      fetchAndSetTables={fetchAndSetTables}
      setLoadingDatabaseKeys={setLoadingDatabaseKeys}
      getAdapter={getAdapter}
      treeNodeDeps={treeNodeDeps}
      showSavedQueriesInTree={showSavedQueriesInTree}
      simpleMode={simpleMode}
      onContextMenuChange={setContextMenu}
      onSelectSavedQuery={onSelectSavedQuery}
      getGroupItems={getGroupItems}
      contextMenu={contextMenu}
      contextMenuConnection={contextMenuConnection}
      contextMenuDatabaseAdapter={contextMenuDatabaseAdapter}
      onNewConnection={openCreateDialog}
      onImportConnection={() => setIsImportDialogOpen(true)}
      onEdit={openEditDialog}
      onDuplicate={handleDuplicateConnection}
      onReconnect={handleReconnect}
      onCreateQuery={handleCreateQueryFromContext}
      onCreateDatabase={openCreateDatabaseDialog}
      onDelete={setDeleteTargetConnectionId}
      supportsCreateDatabaseForDriver={supportsCreateDatabaseForDriver}
      onRefreshDatabaseTables={handleRefreshDatabaseTables}
      onDatabaseImport={handleDatabaseImport}
      onDatabaseExport={handleDatabaseExport}
      onCreateTable={onCreateTable}
    />
    <ConnectionTreeDialogs
      contextMenu={contextMenu}
      onCloseContextMenu={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
      connections={connections}
      contextMenuConnection={contextMenuConnection}
      contextMenuDatabaseAdapter={contextMenuDatabaseAdapter}
      onEdit={openEditDialog}
      onDuplicate={handleDuplicateConnection}
      onReconnect={handleReconnect}
      onCreateQuery={handleCreateQueryFromContext}
      onCreateDatabase={openCreateDatabaseDialog}
      onDelete={setDeleteTargetConnectionId}
      supportsCreateDatabaseForDriver={supportsCreateDatabaseForDriver}
      onRefreshDatabaseTables={handleRefreshDatabaseTables}
      onDatabaseImport={handleDatabaseImport}
      onDatabaseExport={handleDatabaseExport}
      onCreateTable={onCreateTable}
      createEsIndexDialogOpen={isCreateEsIndexDialogOpen}
      createEsIndexConnectionId={createEsIndexConnectionId}
      onCreateEsIndexDialogOpenChange={(open) => {
        setIsCreateEsIndexDialogOpen(open);
        if (!open) setCreateEsIndexConnectionId(null);
      }}
      onEsIndexCreated={async () => {
        if (createEsIndexConnectionId) {
          await handleRefreshDatabaseTables(createEsIndexConnectionId, "Indices");
        }
      }}
      isCreateDbDialogOpen={isCreateDbDialogOpen}
      onCloseCreateDbDialog={closeCreateDbDialog}
      createDbForm={createDbForm}
      setCreateDbForm={setCreateDbForm}
      showCreateDbAdvanced={showCreateDbAdvanced}
      setShowCreateDbAdvanced={setShowCreateDbAdvanced}
      createDbValidationMsg={createDbValidationMsg}
      isCreatingDatabase={isCreatingDatabase}
      mysqlCharsets={mysqlCharsets}
      mysqlCollations={mysqlCollations}
      loadingMysqlOptions={loadingMysqlOptions}
      isMySqlFamilyCreateDb={isMySqlFamilyCreateDb}
      isPostgresCreateDb={isPostgresCreateDb}
      isMssqlCreateDb={isMssqlCreateDb}
      onCreateDatabase={handleCreateDatabase}
      deleteTargetConnectionId={deleteTargetConnectionId}
      onDeleteTargetChange={setDeleteTargetConnectionId}
      isDeleting={isDeleting}
      onDeleteConnection={handleDeleteConnection}
      isImportConfirmOpen={isImportConfirmOpen}
      isImportingSql={isImportingSql}
      pendingImportDatabaseName={pendingImport?.databaseName}
      pendingImportFilePath={pendingImport?.filePath}
      onConfirmImport={handleConfirmImport}
      onImportConfirmOpenChange={setIsImportConfirmOpen}
      onClearPendingImport={() => setPendingImport(null)}
      isTableExportDialogOpen={isTableExportDialogOpen}
      isExportingTable={isExportingTable}
      pendingTableExportTableName={pendingTableExport?.table.name}
      onTableExportDialogOpenChange={setIsTableExportDialogOpen}
      onClearPendingTableExport={() => setPendingTableExport(null)}
      tableExportFormat={tableExportFormat}
      setTableExportFormat={setTableExportFormat}
      onTableExportConfirm={handleTableExportConfirm}
      isDatabaseExportDialogOpen={isDatabaseExportDialogOpen}
      isExportingDatabaseSql={isExportingDatabaseSql}
      pendingDatabaseExportName={pendingDatabaseExport?.databaseName}
      pendingDatabaseExportFormat={pendingDatabaseExport?.format || "sql_full"}
      onDatabaseExportDialogOpenChange={setIsDatabaseExportDialogOpen}
      onClearPendingDatabaseExport={() => setPendingDatabaseExport(null)}
      onDatabaseExportFormatChange={(value: DatabaseExportFormat) =>
        setPendingDatabaseExport((prev) =>
          prev ? { ...prev, format: value } : prev,
        )
      }
      onConfirmDatabaseExport={handleConfirmDatabaseExport}
    />
  </div>
);
```

- [ ] **Step 3: 删除不再需要的导入**

删除以下导入（已移入子组件）：
- `Database`, `Plus`, `RefreshCw`, `FileCode`, `Search`, `FolderOpen` from lucide-react
- `getConnectionIcon` from driver-registry
- `ConnectionContextMenu` 
- `InlineContextMenu`
- `renderConnectionStatusIndicator`
- `GroupNodeRenderer`
- `TreeNodeDeps` type

保留以下导入（仍在 ConnectionList 中使用）：
- `Loader2` from lucide-react（如果有使用）
- 所有 hooks
- `api`, `ConnectionForm`, `Driver`, `RoutineType`, `SavedQuery` types
- `DatabaseGroupConfig` type
- `supportsSchemaBrowsing` from driver-registry
- `TreeCallbacks` type
- `toast` from sonner
- `ConnectionDialog` (由 SidebarHeader 导入)
- `ImportDialog` (由 SidebarHeader 导入)
- `ConnectionDialogs` (由 ConnectionTreeDialogs 导入)
- `errorMessage` from errors
- `useTranslation`
- 其他 hooks

- [ ] **Step 4: 验证类型**

Run: `npx tsc --noEmit --pretty`
Expected: PASS

- [ ] **Step 5: 运行 lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/business/Sidebar/ConnectionList.tsx
git commit -m "refactor: use extracted sub-components in ConnectionList"
```

---

### Task 6: 最终验证

- [ ] **Step 1: 类型检查**

Run: `npx tsc --noEmit --pretty`
Expected: PASS

- [ ] **Step 2: Lint 检查**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: 确认行数**

Run: `wc -l src/components/business/Sidebar/ConnectionList.tsx`
Expected: ~300 行

- [ ] **Step 4: Commit 最终状态**

```bash
git add -A
git commit -m "refactor: ConnectionList split into 4 sub-components (~1382 -> ~300 lines)"
```
