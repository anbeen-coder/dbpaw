# TabContentRenderer Context 拆分实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `TabContentRendererProps` 的 23 个扁平字段按领域拆分为 5 个 React Context，消除"总线化"传参。

**Architecture:** 新建 `tab-contexts.tsx` 定义 5 个 Context + hooks + `TabActionsProvider` 组合组件。`TabContentRenderer.tsx` 内部包裹 Provider，子组件通过 hook 取代 `props` 参数。App.tsx 调用方式不变。

**Tech Stack:** React Context API, TypeScript

**Spec:** `docs/superpowers/specs/2026-06-05-tab-content-renderer-context-split-design.md`

---

### Task 1: 创建 tab-contexts.tsx

**Files:**
- Create: `src/components/layout/tab-contexts.tsx`

- [ ] **Step 1: 创建文件，定义 5 个 interface 和 Context**

```typescript
import { createContext, useContext, type ReactNode } from "react";
import type { TabItem } from "@/types/tab";

// ── Editor Actions ──
interface EditorActions {
  handleExecuteQuery: (tabId: string, sql: string) => Promise<void>;
  handleSqlChange: (tabId: string, sql: string) => void;
  handleEditorDatabaseChange: (tabId: string, database: string) => Promise<void>;
  setQueriesLastUpdated: (timestamp: number) => void;
  setTabs: React.Dispatch<React.SetStateAction<TabItem[]>>;
  isDefaultQueryTitle: (title?: string) => boolean;
}

const EditorActionsContext = createContext<EditorActions | null>(null);

// ── Table Actions ──
interface TableActions {
  handlePageChange: (tabId: string, page: number) => Promise<void>;
  handlePageSizeChange: (tabId: string, pageSize: number) => Promise<void>;
  handleSortChange: (tabId: string, column: string, direction: "asc" | "desc") => Promise<void>;
  handleFilterChange: (tabId: string, filter: string, orderBy: string) => Promise<void>;
  handleTableRefresh: (tabId: string, overrides?: any) => Promise<void>;
  handleOpenTableDDL: (ctx: any) => void;
  handleOpenERDiagram: (ctx?: any) => void;
  handleCreateQuery: (connectionId: number, databaseName: string, driver: string) => void;
  showColumnComments: boolean;
  showRowNumbers: boolean;
  showZebraStripes: boolean;
}

const TableActionsContext = createContext<TableActions | null>(null);

// ── Redis Actions ──
interface RedisActions {
  handleOpenRedisConsole: (connection: string, database: string, connectionId: number, driver: string) => void;
  notifyRedisRefresh: (connectionId: number, database: string) => void;
}

const RedisActionsContext = createContext<RedisActions | null>(null);

// ── Schema Actions ──
interface SchemaActions {
  handleCreateTableSuccess: (tabId: string, connectionId: number, database: string, schema: string | undefined, tableName: string, driver: string) => void;
  handleAlterTableSuccess: (tabId: string) => void;
}

const SchemaActionsContext = createContext<SchemaActions | null>(null);

// ── Tab Actions ──
interface TabActions {
  handleCloseTab: (tabId: string) => void;
  setTabs: React.Dispatch<React.SetStateAction<TabItem[]>>;
}

const TabActionsContext = createContext<TabActions | null>(null);
```

- [ ] **Step 2: 添加 5 个 hook**

在同文件追加：

```typescript
export function useEditorActions(): EditorActions {
  const ctx = useContext(EditorActionsContext);
  if (!ctx) throw new Error("useEditorActions must be used within TabActionsProvider");
  return ctx;
}

export function useTableActions(): TableActions {
  const ctx = useContext(TableActionsContext);
  if (!ctx) throw new Error("useTableActions must be used within TabActionsProvider");
  return ctx;
}

export function useRedisActions(): RedisActions {
  const ctx = useContext(RedisActionsContext);
  if (!ctx) throw new Error("useRedisActions must be used within TabActionsProvider");
  return ctx;
}

export function useSchemaActions(): SchemaActions {
  const ctx = useContext(SchemaActionsContext);
  if (!ctx) throw new Error("useSchemaActions must be used within TabActionsProvider");
  return ctx;
}

export function useTabActions(): TabActions {
  const ctx = useContext(TabActionsContext);
  if (!ctx) throw new Error("useTabActions must be used within TabActionsProvider");
  return ctx;
}
```

- [ ] **Step 3: 添加 TabActionsProvider 组合组件**

在同文件追加。接收 `TabContentRendererProps` 中除 `tabs` 和 `activeTab` 外的所有字段，分发到各 Provider：

```typescript
type TabActionsProviderProps = Omit<import("./TabContentRenderer").TabContentRendererProps, "tabs" | "activeTab"> & {
  children: ReactNode;
};

export function TabActionsProvider({ children, ...p }: TabActionsProviderProps) {
  return (
    <TabActionsContext.Provider value={{ handleCloseTab: p.handleCloseTab, setTabs: p.setTabs }}>
      <EditorActionsContext.Provider
        value={{
          handleExecuteQuery: p.handleExecuteQuery,
          handleSqlChange: p.handleSqlChange,
          handleEditorDatabaseChange: p.handleEditorDatabaseChange,
          setQueriesLastUpdated: p.setQueriesLastUpdated,
          setTabs: p.setTabs,
          isDefaultQueryTitle: p.isDefaultQueryTitle,
        }}
      >
        <TableActionsContext.Provider
          value={{
            handlePageChange: p.handlePageChange,
            handlePageSizeChange: p.handlePageSizeChange,
            handleSortChange: p.handleSortChange,
            handleFilterChange: p.handleFilterChange,
            handleTableRefresh: p.handleTableRefresh,
            handleOpenTableDDL: p.handleOpenTableDDL,
            handleOpenERDiagram: p.handleOpenERDiagram,
            handleCreateQuery: p.handleCreateQuery,
            showColumnComments: p.showColumnComments,
            showRowNumbers: p.showRowNumbers,
            showZebraStripes: p.showZebraStripes,
          }}
        >
          <RedisActionsContext.Provider
            value={{
              handleOpenRedisConsole: p.handleOpenRedisConsole,
              notifyRedisRefresh: p.notifyRedisRefresh,
            }}
          >
            <SchemaActionsContext.Provider
              value={{
                handleCreateTableSuccess: p.handleCreateTableSuccess,
                handleAlterTableSuccess: p.handleAlterTableSuccess,
              }}
            >
              {children}
            </SchemaActionsContext.Provider>
          </RedisActionsContext.Provider>
        </TableActionsContext.Provider>
      </EditorActionsContext.Provider>
    </TabActionsContext.Provider>
  );
}
```

- [ ] **Step 4: TypeScript 编译检查**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无 `tab-contexts.tsx` 相关错误（可能有其他文件的已有错误）

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/tab-contexts.tsx
git commit -m "feat: add tab-contexts with 5 domain contexts and TabActionsProvider"
```

---

### Task 2: 改造 TabContentRenderer.tsx

**Files:**
- Modify: `src/components/layout/TabContentRenderer.tsx`

- [ ] **Step 1: 添加 context hook imports**

在文件顶部 import 区追加：

```typescript
import {
  TabActionsProvider,
  useEditorActions,
  useTableActions,
  useRedisActions,
  useSchemaActions,
  useTabActions,
} from "./tab-contexts";
```

- [ ] **Step 2: 改造 EditorTab**

将 `function EditorTab({ tab, props }: { tab: TabItem; props: TabContentRendererProps })` 改为：

```typescript
function EditorTab({ tab }: { tab: TabItem }) {
  const { t } = useTranslation();
  const { handleExecuteQuery, handleSqlChange, handleEditorDatabaseChange, setQueriesLastUpdated, setTabs, isDefaultQueryTitle } = useEditorActions();
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
        onDatabaseChange={(database) => void handleEditorDatabaseChange(tab.id, database)}
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
```

- [ ] **Step 3: 改造 TableTab**

将 `function TableTab({ tab, props }: { tab: TabItem; props: TabContentRendererProps })` 改为：

```typescript
function TableTab({ tab }: { tab: TabItem }) {
  const {
    handlePageChange, handlePageSizeChange, handleSortChange, handleFilterChange,
    handleTableRefresh, handleOpenTableDDL, handleOpenERDiagram, handleCreateQuery,
    showColumnComments, showRowNumbers, showZebraStripes,
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
        handleOpenERDiagram({ connectionId: ctx.connectionId, database: ctx.database });
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
```

- [ ] **Step 4: 改造 RedisKeyTab**

将 `function RedisKeyTab({ tab, props }: { tab: TabItem; props: TabContentRendererProps })` 改为：

```typescript
function RedisKeyTab({ tab }: { tab: TabItem }) {
  const { setTabs, handleCloseTab } = useTabActions();
  const { notifyRedisRefresh } = useRedisActions();
  if (tab.connectionId === undefined || !tab.database || tab.redisKey === undefined) {
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
              item.id === tab.id ? { ...item, title: key, redisKey: key } : item,
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
```

- [ ] **Step 5: 改造 RedisBrowserTab**

将 `function RedisBrowserTab({ tab, props }: { tab: TabItem; props: TabContentRendererProps })` 改为：

```typescript
function RedisBrowserTab({ tab }: { tab: TabItem }) {
  const { handleOpenRedisConsole } = useRedisActions();
  if (tab.connectionId === undefined || !tab.database) return null;
  return (
    <Suspense fallback={<LazyPanelFallback label="Loading Redis Browser..." />}>
      <RedisBrowserView
        connectionId={tab.connectionId}
        database={tab.database}
        onOpenConsole={() =>
          handleOpenRedisConsole(tab.connection!, tab.database!, tab.connectionId!, tab.driver!)
        }
      />
    </Suspense>
  );
}
```

- [ ] **Step 6: 改造 CreateTableTab**

将 `function CreateTableTab({ tab, props }: { tab: TabItem; props: TabContentRendererProps })` 改为：

```typescript
function CreateTableTab({ tab }: { tab: TabItem }) {
  const { t } = useTranslation();
  const { handleCreateTableSuccess } = useSchemaActions();
  const { handleCloseTab } = useTabActions();
  if (tab.connectionId === undefined || !tab.database || !tab.driver) return null;
  return (
    <Suspense fallback={<LazyPanelFallback label={t("common.loading")} />}>
      <CreateTableView
        connectionId={tab.connectionId}
        database={tab.database}
        schema={tab.schema ?? ""}
        driver={tab.driver}
        onSuccess={(tableName) =>
          handleCreateTableSuccess(tab.id, tab.connectionId!, tab.database!, tab.schema, tableName, tab.driver!)
        }
        onCancel={() => handleCloseTab(tab.id)}
      />
    </Suspense>
  );
}
```

- [ ] **Step 7: 改造 AlterTableTab**

将 `function AlterTableTab({ tab, props }: { tab: TabItem; props: TabContentRendererProps })` 改为：

```typescript
function AlterTableTab({ tab }: { tab: TabItem }) {
  const { t } = useTranslation();
  const { handleAlterTableSuccess } = useSchemaActions();
  const { handleCloseTab } = useTabActions();
  if (tab.connectionId === undefined || !tab.database || !tab.tableName || !tab.driver) return null;
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
```

- [ ] **Step 8: 更新 TabRenderer 类型和 TAB_RENDERERS 调用**

将：
```typescript
type TabRenderer = ComponentType<{ tab: TabItem; props: TabContentRendererProps }>;
```
改为：
```typescript
type TabRenderer = ComponentType<{ tab: TabItem }>;
```

将 `TabContentRenderer` 函数体内的：
```typescript
<Renderer tab={tab} props={props} />
```
改为：
```typescript
<Renderer tab={tab} />
```

- [ ] **Step 9: 用 TabActionsProvider 包裹渲染输出**

将 `TabContentRenderer` 函数体改为：

```typescript
export function TabContentRenderer({
  tabs,
  activeTab: _activeTab,
  ...rest
}: TabContentRendererProps) {
  const { t } = useTranslation();
  const props = { tabs, activeTab: _activeTab, ...rest } as TabContentRendererProps;

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
              <TabsContent key={tab.id} value={tab.id} forceMount className="h-full m-0">
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
```

- [ ] **Step 10: TypeScript 编译检查**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无 `TabContentRenderer.tsx` 或 `tab-contexts.tsx` 相关错误

- [ ] **Step 11: Lint 检查**

Run: `npx eslint src/components/layout/TabContentRenderer.tsx src/components/layout/tab-contexts.tsx --max-warnings=0`
Expected: 无 error

- [ ] **Step 12: Commit**

```bash
git add src/components/layout/TabContentRenderer.tsx
git commit -m "refactor: TabContentRenderer sub-components use context hooks instead of flat props"
```

---

### Task 3: 最终验证

- [ ] **Step 1: 全量 TypeScript 检查**

Run: `npx tsc --noEmit --pretty`
Expected: 无新增错误

- [ ] **Step 2: 全量 Lint**

Run: `npx eslint src/components/layout/ --max-warnings=0`
Expected: 无 error
