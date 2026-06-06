# ConnectionList.tsx 子组件拆分设计

## 背景

`ConnectionList.tsx` 当前 1382 行。此前已提取 7 个 hooks（useTreeExpansion、useConnectionCrud、useTreeDataFetching、useConnectionForm、useCreateDatabase、useRedisKeys、useImportExport）和 3 个子组件（getDatasourceTreeAdapter、InlineContextMenu、ConnectionDialogs）。

但组件仍然过大，剩余 ~12 个 useState 和大量渲染逻辑。本次目标是将渲染块拆分为 4 个子组件。

## 目标

将 ConnectionList.tsx 从 1382 行缩减到 ~300 行。只拆分渲染，不改变状态管理和 hooks。

## 文件结构

```
src/components/business/Sidebar/connection-list/
├── SidebarHeader.tsx          — 新增
├── SidebarSearch.tsx          — 新增
├── ConnectionTreeContent.tsx  — 新增（最大，~250 行）
├── ConnectionTreeDialogs.tsx  — 新增
├── ConnectionDialog.tsx       — 已有
├── ConnectionDialogs.tsx      — 已有
├── InlineContextMenu.tsx      — 已有
├── TreeNode.tsx               — 已有
├── TreeNodeRenderers.tsx      — 已有
├── getDatasourceTreeAdapter.tsx — 已有
├── helpers.tsx                — 已有
└── types.ts                   — 已有
```

## 子组件 1：SidebarHeader

### 职责

渲染侧边栏顶部标题栏：标题、刷新按钮、新建连接按钮、导入按钮，以及 ConnectionDialog 和 ImportDialog。

### Props

```tsx
interface SidebarHeaderProps {
  isLoadingConnections: boolean;
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
```

### 预计行数：~60 行

## 子组件 2：SidebarSearch

### 职责

渲染搜索输入框。

### Props

```tsx
interface SidebarSearchProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}
```

### 预计行数：~15 行

## 子组件 3：ConnectionTreeContent

### 职责

渲染整个连接树：ConnectionContextMenu 包裹层 + connections.map + renderDatabaseTreeNode 闭包。

这是最大的子组件，包含：
- ConnectionContextMenu 包裹
- 连接级 TreeNode 渲染
- 数据库级 TreeNode 渲染（renderDatabaseTreeNode）
- Schema 级 TreeNode 渲染
- Saved queries 渲染

### Props

```tsx
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
  isLoadingQueries: boolean;
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
}
```

### 预计行数：~250 行

## 子组件 4：ConnectionTreeDialogs

### 职责

包裹 InlineContextMenu 和 ConnectionDialogs，将所有对话框相关 props 集中传递。

### Props

```tsx
interface ConnectionTreeDialogsProps {
  // InlineContextMenu
  contextMenu: ContextMenuState;
  onCloseContextMenu: () => void;
  connections: Connection[];
  contextMenuConnection: Connection | null;
  contextMenuDatabaseAdapter: DatasourceTreeAdapter | null;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReconnect: (id: string) => void;
  onCreateQuery: (connectionId: string, databaseName?: string) => void;
  onCreateDatabase: (id: string) => void;
  onDelete: (id: string) => void;
  supportsCreateDatabaseForDriver: (driver: string) => boolean;
  onRefreshDatabaseTables: (connectionId: string, databaseName: string) => void;
  onDatabaseImport: (connectionId: string, databaseName: string) => void;
  onDatabaseExport: (connectionId: string, databaseName: string) => void;
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
```

### 预计行数：~80 行

## 重构后的 ConnectionList.tsx

```tsx
export function ConnectionList(props: ConnectionListProps) {
  const { t } = useTranslation();

  // 所有 hooks 保持不变
  const treeExpansion = useTreeExpansion();
  const connectionCrud = useConnectionCrud(...);
  const treeDataFetching = useTreeDataFetching(...);
  const connectionForm = useConnectionForm(...);
  const createDatabase = useCreateDatabase(...);
  const redisKeys = useRedisKeys(...);
  const importExport = useImportExport(...);

  // 剩余 state（selectedTableNode, contextMenu, searchTerm 等）
  // 剩余 callbacks（getAdapter, handleElasticsearchIndexAction 等）
  // 剩余 effects（activeTableTarget sync, autoScroll 等）

  return (
    <div className="h-full flex flex-col bg-background border-r border-border">
      <SidebarHeader {...headerProps} />
      <SidebarSearch {...searchProps} />
      <ConnectionTreeContent {...treeProps} />
      <ConnectionTreeDialogs {...dialogProps} />
    </div>
  );
}
```

## 预期结果

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| ConnectionList.tsx 行数 | 1382 | ~300 |
| 新增文件 | 0 | 4 |
| 移出的行数 | 0 | ~1082 |

## 验证

1. `npm run typecheck` 通过
2. `npm run lint` 通过
3. 手动冒烟测试：连接、展开树、右键菜单、对话框、搜索

## 实现顺序

1. `SidebarSearch` — 最简单，无依赖
2. `SidebarHeader` — 依赖 ConnectionDialog 和 ImportDialog
3. `ConnectionTreeContent` — 最大，依赖 TreeNode 和 TreeNodeRenderers
4. `ConnectionTreeDialogs` — 依赖 InlineContextMenu 和 ConnectionDialogs
5. 更新 ConnectionList.tsx 导入和使用
6. 验证
