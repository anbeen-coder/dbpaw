# ConnectionList 状态域拆分设计

## 背景

`ConnectionList.tsx` 当前 1073 行，拥有 10 个 `useState`、10 个 `useEffect`、5 个 `useCallback`、1 个 `useMemo`。虽然已提取 7 个 hooks（useConnectionCrud, useConnectionForm, useTreeExpansion, useTreeDataFetching, useCreateDatabase, useImportExport, useRedisKeys），组件仍然是所有协调逻辑的汇聚点。

目标：按"状态域"进一步拆分，让 ConnectionList 变成无状态编排器，未来新增 datasource（Cassandra/DynamoDB/更多 NoSQL）时主组件不会继续膨胀。

## 方案选择

**方案 3：混合方案** — 协调逻辑用 hook，有 UI 渲染的用组件。

- `useConnectionTreeController`（hook）：管理所有跨树协调状态和 effects
- `useSavedQueries`（hook）：管理 saved queries 状态和 fetch
- `ConnectionContextMenuHost`（组件）：管理 context menu 状态和渲染

不选方案 1（全 hook）因为 ConnectionList return 仍有大量 props 传递。
不选方案 2（全组件）因为 `ConnectionTreeController` 没有 JSX，强行包装成组件多一层无意义 wrapper。

## 新增文件

```
src/components/business/Sidebar/
├── hooks/
│   ├── useConnectionTreeController.ts   ← 新增
│   └── useSavedQueries.ts               ← 新增
├── connection-list/
│   └── ConnectionContextMenuHost.tsx     ← 新增
└── ConnectionList.tsx                    ← 瘦身
```

## `useConnectionTreeController` hook

输入各 domain hook 的引用，输出协调后的状态和 handlers。

### 拥有的状态

| 状态 | 原 ConnectionList 行号 |
|------|------|
| `selectedTableNode` | 283 |
| `autoScrollRequest` | 286 |
| `searchTerm` | 309 |
| `showElasticsearchSystemIndices` | 299 |
| `showMongoSystemCollections` | 301 |
| `createEsIndexConnectionId` | 303 |
| `isCreateEsIndexDialogOpen` | 306 |

### 拥有的 effects

| Effect | 行号 | 职责 |
|--------|------|------|
| 搜索自动展开 | 428-475 | `searchTerm` 变化时展开匹配节点 |
| fetch connections on mount | 477-479 | 挂载时拉连接列表 |
| Redis key 加载 | 512-522 | `searchTerm` 变化时加载展开中的 Redis key |
| active table 同步 | 675-751 | `activeTableTarget` 变化时展开+高亮 |
| sidebar reveal | 753-783 | 收到 reveal 请求时设置 auto-scroll |
| Redis refresh | 785-797 | 收到 refresh 请求时刷新 Redis key |
| auto-scroll 执行 | 799-843 | `autoScrollRequest` 变化时 scrollIntoView |
| ES 系统索引切换 | 845-858 | 切换后刷新 ES 树 |
| Mongo 系统集合切换 | 860-875 | 切换后刷新 Mongo 树 |

### 拥有的 callbacks

- `openCreateElasticsearchIndexDialog`（line 524）
- `handleElasticsearchIndexAction`（line 534）
- `handleOpenERDiagram`（line 562）
- `handleCreateQueryFromContext`（line 576）

### 计算值

- `filteredConnections`（useMemo，line 362-426）

### 签名

```ts
function useConnectionTreeController(deps: {
  crud: ReturnType<typeof useConnectionCrud>
  expansion: ReturnType<typeof useTreeExpansion>
  dataFetching: ReturnType<typeof useTreeDataFetching>
  redisKeys: ReturnType<typeof useRedisKeys>
}) {
  return {
    selectedTableNode,
    searchTerm, setSearchTerm,
    filteredConnections,
    autoScrollRequest,
    showElasticsearchSystemIndices, setShowElasticsearchSystemIndices,
    showMongoSystemCollections, setShowMongoSystemCollections,
    createEsIndexConnectionId, setCreateEsIndexConnectionId,
    isCreateEsIndexDialogOpen, setIsCreateEsIndexDialogOpen,
    openCreateElasticsearchIndexDialog,
    handleElasticsearchIndexAction,
    handleOpenERDiagram,
    handleCreateQueryFromContext,
  }
}
```

## `useSavedQueries` hook

### 拥有的状态

| 状态 | 行号 |
|------|------|
| `savedQueriesByConnection` | 315 |
| `isLoadingQueries` | 308 |

### 拥有的 effect

- 监听 `showSavedQueriesInTree` 和 `lastUpdated`（line 481-484）

### 拥有的 callback

- `fetchSavedQueriesByConnection`（line 486-510）

### 签名

```ts
function useSavedQueries(options: {
  showSavedQueriesInTree: boolean
  lastUpdated?: number
}) {
  return { savedQueriesByConnection, isLoadingQueries }
}
```

`showSavedQueriesInTree` 和 `lastUpdated` 来自 ConnectionList 的 props，透传进来即可。

## `ConnectionContextMenuHost` 组件

只搬 context menu 本身，不搬关联的确认 dialog（delete confirm、create database、create ES index 留在 `ConnectionTreeDialogs`）。

### 拥有的状态

| 状态 | 行号 |
|------|------|
| `contextMenu` | 290-298 |

### 渲染内容

- context menu 的菜单项和点击处理
- 点击菜单项后调用 ConnectionList 传进来的回调

### Props

```tsx
<ConnectionContextMenuHost
  visible={contextMenu.visible}
  x={contextMenu.x}
  y={contextMenu.y}
  type={contextMenu.type}
  connection={contextMenuConnection}
  databaseAdapter={contextMenuDatabaseAdapter}
  onClose={...}
  onEditConnection={...}
  onDuplicateConnection={...}
  onDeleteConnection={...}
  onCreateQuery={...}
  onCreateDatabase={...}
  onOpenERDiagram={...}
  ...
/>
```

## 不动的部分

以下已提取的组件和 hooks 保持不变：

- `SidebarHeader`、`SidebarSearch`、`ConnectionTreeContent`、`ConnectionTreeDialogs`
- `useConnectionCrud`、`useConnectionForm`、`useTreeExpansion`、`useTreeDataFetching`、`useCreateDatabase`、`useImportExport`、`useRedisKeys`
- `getAdapter` callback 和 `getGroupItems` callback 留在 ConnectionList

## ConnectionList 最终形态

重构后 ConnectionList：

- **0 个 `useState`** — 全搬到 hook/容器里
- **0 个 `useEffect`** — 全搬到 `useConnectionTreeController`
- **0 个 `useMemo`** — `filteredConnections` 搬到 Controller
- **预估行数**：从 1073 行降到 ~550-600 行

职责：hook 组装 + prop 分发。

## 实施顺序

1. 创建 `useSavedQueries` hook（最简单，独立性强）
2. 创建 `useConnectionTreeController` hook（最复杂，依赖多个 hook 引用）
3. 创建 `ConnectionContextMenuHost` 组件（需要从 ConnectionTreeDialogs 搬 UI）
4. 重构 ConnectionList 使用新 hook/组件
5. 验证：`cargo check` + TypeScript 编译 + 现有功能不变
