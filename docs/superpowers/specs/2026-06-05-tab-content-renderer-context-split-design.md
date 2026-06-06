# TabContentRenderer Context 拆分设计

## 问题

`TabContentRendererProps`（`src/components/layout/TabContentRenderer.tsx:88`）是一个 23 个字段的扁平对象，把 editor、table、redis、schema、tab 生命周期等不同领域的 handler 全部塞在一起。每个 tab 子组件只使用其中 2-6 个字段，但都接收完整的 props 对象。新增 tab 类型时这个接口会继续膨胀。

## 方案

用 5 个 React Context 按领域拆分，每个 tab 子组件通过对应的 `useXxxActions()` hook 只获取自己需要的 handler。App.tsx 的调用方式不变。

## Context 定义

### EditorActionsContext

SQL 编辑器相关操作。

| 字段 | 类型 | 消费者 |
|------|------|--------|
| `handleExecuteQuery` | `(tabId: string, sql: string) => Promise<void>` | EditorTab |
| `handleSqlChange` | `(tabId: string, sql: string) => void` | EditorTab |
| `handleEditorDatabaseChange` | `(tabId: string, database: string) => Promise<void>` | EditorTab |
| `setQueriesLastUpdated` | `(timestamp: number) => void` | EditorTab |
| `setTabs` | `React.Dispatch<React.SetStateAction<TabItem[]>>` | EditorTab |
| `isDefaultQueryTitle` | `(title?: string) => boolean` | EditorTab |

### TableActionsContext

表格数据浏览相关操作及显示偏好。

| 字段 | 类型 | 消费者 |
|------|------|--------|
| `handlePageChange` | `(tabId: string, page: number) => Promise<void>` | TableTab |
| `handlePageSizeChange` | `(tabId: string, pageSize: number) => Promise<void>` | TableTab |
| `handleSortChange` | `(tabId: string, column: string, direction: "asc" \| "desc") => Promise<void>` | TableTab |
| `handleFilterChange` | `(tabId: string, filter: string, orderBy: string) => Promise<void>` | TableTab |
| `handleTableRefresh` | `(tabId: string, overrides?: any) => Promise<void>` | TableTab |
| `handleOpenTableDDL` | `(ctx: any) => void` | TableTab |
| `handleOpenERDiagram` | `(ctx?: any) => void` | TableTab |
| `handleCreateQuery` | `(connectionId: number, databaseName: string, driver: string) => void` | TableTab |
| `showColumnComments` | `boolean` | TableTab |
| `showRowNumbers` | `boolean` | TableTab |
| `showZebraStripes` | `boolean` | TableTab |

### RedisActionsContext

Redis 相关操作。

| 字段 | 类型 | 消费者 |
|------|------|--------|
| `handleOpenRedisConsole` | `(connection: string, database: string, connectionId: number, driver: string) => void` | RedisBrowserTab |
| `notifyRedisRefresh` | `(connectionId: number, database: string) => void` | RedisKeyTab |

### SchemaActionsContext

建表/改表相关操作。

| 字段 | 类型 | 消费者 |
|------|------|--------|
| `handleCreateTableSuccess` | `(tabId: string, connectionId: number, database: string, schema: string \| undefined, tableName: string, driver: string) => void` | CreateTableTab |
| `handleAlterTableSuccess` | `(tabId: string) => void` | AlterTableTab |

### TabActionsContext

Tab 生命周期的共享操作。

| 字段 | 类型 | 消费者 |
|------|------|--------|
| `handleCloseTab` | `(tabId: string) => void` | RedisKeyTab, CreateTableTab, AlterTableTab |
| `setTabs` | `React.Dispatch<React.SetStateAction<TabItem[]>>` | EditorTab, RedisKeyTab |

## 子组件改造

### props 签名变化

所有使用 `props: TabContentRendererProps` 的子组件改为通过 context hook 获取所需方法。

```
// 之前
function EditorTab({ tab, props }: { tab: TabItem; props: TabContentRendererProps })

// 之后
function EditorTab({ tab }: { tab: TabItem })
  内部: const { handleExecuteQuery, ... } = useEditorActions();
```

### TabRenderer 类型变化

```typescript
// 之前
type TabRenderer = ComponentType<{ tab: TabItem; props: TabContentRendererProps }>;

// 之后
type TabRenderer = ComponentType<{ tab: TabItem }>;
```

### 各子组件的 context 消费

| 子组件 | 消费的 Context |
|--------|---------------|
| `EditorTab` | `useEditorActions()` |
| `TableTab` | `useTableActions()` |
| `RedisKeyTab` | `useTabActions()` + `useRedisActions()` |
| `RedisBrowserTab` | `useRedisActions()` |
| `CreateTableTab` | `useSchemaActions()` + `useTabActions()` |
| `AlterTableTab` | `useSchemaActions()` + `useTabActions()` |
| `RedisConsoleTab` | 不变（不消费 context） |
| `RedisServerInfoTab` | 不变 |
| `ElasticsearchIndexTab` | 不变 |
| `ERDiagramTab` | 不变 |
| `RoutineTab` | 不变 |
| `MetadataFallbackTab` | 不变 |

## 文件结构

```
src/components/layout/
├── TabContentRenderer.tsx   # 改造：包裹 Provider，子组件用 hook 取代 props
├── tab-contexts.tsx         # 新增：5 个 Context + TabActionsProvider + hooks
```

## TabContentRenderer 改造

`TabContentRenderer` 内部用 `<TabActionsProvider>` 包裹子树，将收到的 props 按领域分发到各 Provider。对外接口（`TabContentRendererProps`）不变，App.tsx 零改动。

```typescript
export function TabContentRenderer({ tabs, activeTab: _activeTab, ...rest }: TabContentRendererProps) {
  const props = { tabs, activeTab: _activeTab, ...rest } as TabContentRendererProps;

  return (
    <TabActionsProvider
      handleCloseTab={props.handleCloseTab}
      setTabs={props.setTabs}
      handleExecuteQuery={props.handleExecuteQuery}
      handleSqlChange={props.handleSqlChange}
      handleEditorDatabaseChange={props.handleEditorDatabaseChange}
      setQueriesLastUpdated={props.setQueriesLastUpdated}
      isDefaultQueryTitle={props.isDefaultQueryTitle}
      handlePageChange={props.handlePageChange}
      handlePageSizeChange={props.handlePageSizeChange}
      handleSortChange={props.handleSortChange}
      handleFilterChange={props.handleFilterChange}
      handleTableRefresh={props.handleTableRefresh}
      handleOpenTableDDL={props.handleOpenTableDDL}
      handleOpenERDiagram={props.handleOpenERDiagram}
      handleCreateQuery={props.handleCreateQuery}
      showColumnComments={props.showColumnComments}
      showRowNumbers={props.showRowNumbers}
      showZebraStripes={props.showZebraStripes}
      handleOpenRedisConsole={props.handleOpenRedisConsole}
      notifyRedisRefresh={props.notifyRedisRefresh}
      handleCreateTableSuccess={props.handleCreateTableSuccess}
      handleAlterTableSuccess={props.handleAlterTableSuccess}
    >
      {/* 渲染循环，Renderer 不再传 props */}
    </TabActionsProvider>
  );
}
```

## 不变的部分

- `App.tsx` — 调用 `<TabContentRenderer>` 的方式不变，继续传同样的 props
- `TabContentRendererProps` 接口 — 字段不变，只是内部消费方式变了
- 不消费 context 的子组件（RedisConsoleTab、ERDiagramTab 等）— 零改动
