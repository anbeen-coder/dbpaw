# App.tsx 组件拆分设计文档

## 1. 概述

### 1.1 项目背景
DbPaw 是一个 Tauri 2 桌面数据库管理应用，支持 16 种数据库驱动。当前 `App.tsx` 文件长达 2518 行，包含所有应用状态、业务逻辑和 UI 渲染，是主要的可维护性风险。

### 1.2 重构目标
- **纯粹重构**：不改变功能，只改善代码组织
- **行为兼容**：保持所有现有功能完全不变
- **充足时间**：可以投入大量时间进行彻底重构

### 1.3 设计原则
- 单一职责原则
- 关注点分离
- 保持现有功能
- 渐进式重构

## 2. 现状分析

### 2.1 App.tsx 当前问题
1. **状态管理集中**：所有状态（tabs、activeTab、aiVisible 等）都在 App.tsx 中
2. **业务逻辑混杂**：所有事件处理函数（handleCreateQuery、handleExecuteQuery 等）都在 App.tsx 中
3. **UI 渲染复杂**：整个应用的 UI 结构都在 App.tsx 中
4. **难以测试**：由于逻辑集中，难以进行单元测试

### 2.2 文件大小
- App.tsx：2518 行
- api.ts：1771 行
- mocks.ts：2514 行

## 3. 设计方案

### 3.1 方法选择
采用 **混合方法**：结合 Hook 拆分和组件拆分

### 3.2 状态管理 Hooks

#### 3.2.1 `useTabManager` Hook
**职责**：管理所有标签页状态
**状态**：
- `tabs`: TabItem[]
- `activeTab`: string

**方法**：
- `handleMainTabChange(tabId: string)`: 切换活动标签
- `handleDragEnd(event: DragEndEvent)`: 处理拖拽排序
- `handleCycleTabs(direction: 1 | -1)`: 循环切换标签
- `closeTabNow(tabId: string)`: 立即关闭标签
- `setTabs`: 更新标签状态的函数
- `setActiveTab`: 更新活动标签的函数

**依赖**：
- `revealSidebarForTab`: 显示侧边栏中的标签（由 App 组件提供）

#### 3.2.2 `useQueryEditor` Hook
**职责**：管理 SQL 编辑器相关逻辑
**状态**：
- 无独立状态，依赖 useTabManager

**方法**：
- `handleCreateQuery(connectionId, databaseName, driver)`: 创建新查询
- `handleExecuteQuery(tabId, sql)`: 执行查询
- `handleSqlChange(tabId, sql)`: 更新 SQL 内容
- `handleEditorDatabaseChange(tabId, database)`: 切换数据库
- `handleOpenSavedQuery(query)`: 打开已保存的查询
- `saveEditorTab(tab, name, description)`: 保存查询

**依赖**：
- `tabs`, `setTabs`, `activeTab`, `setActiveTab`: 来自 useTabManager
- `api`: API 服务
- `fetchEditorDatabases`: 获取数据库列表（由 App 组件提供）
- `fetchEditorSchemaOverview`: 获取架构概览（由 App 组件提供）

#### 3.2.3 `useTableViewer` Hook
**职责**：管理表格数据查看逻辑
**状态**：
- 无独立状态，依赖 useTabManager

**方法**：
- `handleTableSelect(connection, database, table, connectionId, driver, schemaName)`: 选择表格
- `handleTableRefresh(tabId, overrides?)`: 刷新表格数据
- `handlePageChange(tabId, page)`: 切换页面
- `handlePageSizeChange(tabId, pageSize)`: 切换页面大小
- `handleSortChange(tabId, column, direction)`: 切换排序
- `handleFilterChange(tabId, filter, orderBy)`: 切换过滤器

**依赖**：
- `tabs`, `setTabs`: 来自 useTabManager
- `api`: API 服务
- `resolveTableScope`: 解析表范围（由 App 组件提供）

#### 3.2.4 `useUnsavedChanges` Hook
**职责**：管理未保存更改的处理
**状态**：
- `pendingCloseTabIds`: string[]
- `currentCloseTabId`: string | null
- `isUnsavedConfirmOpen`: boolean
- `isCloseSaveDialogOpen`: boolean

**方法**：
- `requestCloseTabs(tabIds: string[])`: 请求关闭标签
- `handleUnsavedCloseCancel()`: 取消关闭
- `handleUnsavedCloseWithoutSave()`: 不保存关闭
- `handleUnsavedCloseSave()`: 保存并关闭

**依赖**：
- `tabs`: 来自 useTabManager
- `closeTabNow`: 来自 useTabManager
- `saveEditorTab`: 来自 useQueryEditor

#### 3.2.5 `useKeyboardShortcuts` Hook
**职责**：管理全局键盘快捷键
**方法**：
- 设置和清理键盘事件监听器
- 处理 Ctrl+Tab、Ctrl+Shift+Tab、Ctrl+W 等快捷键

**依赖**：
- `activeTab`, `tabs`: 来自 useTabManager
- `handleCycleTabs`: 来自 useTabManager
- `handleCloseTab`: 来自 useUnsavedChanges
- `handleCreateQuery`: 来自 useQueryEditor
- `setAiVisible`, `setOpenSettings`: 由 App 组件提供
- `useShortcutMatcher`: 快捷键匹配器
- `isModKey`, `shouldIgnoreGlobalShortcut`: 键盘工具函数

### 3.3 UI 组件拆分

#### 3.3.1 `AppLayout` 组件
**职责**：整体布局结构
**Props**：
- `aiVisible`: boolean
- `setAiVisible`: (visible: boolean) => void
- `sidebarLayout`: "tabs" | "tree"
- `children`: React.ReactNode

**包含**：
- 窗口拖动区域
- ResizablePanelGroup
- 侧边栏
- 主面板
- AI 侧边栏

#### 3.3.2 `TabBar` 组件
**职责**：标签栏 UI
**Props**：
- `tabs`: TabItem[]
- `activeTab`: string
- `onTabChange`: (tabId: string) => void
- `onDragEnd`: (event: DragEndEvent) => void
- `onCloseTab`: (tabId: string) => void
- `onCloseOtherTabs`: (tabId: string) => void

**包含**：
- TabsList
- SortableContext
- 标签项渲染
- 右键菜单

#### 3.3.3 `TabContentRenderer` 组件
**职责**：根据标签类型渲染对应内容
**Props**：
- `tabs`: TabItem[]
- `activeTab`: string
- `handleExecuteQuery`: (tabId: string, sql: string) => Promise<void>
- `handleSqlChange`: (tabId: string, sql: string) => void
- `handleEditorDatabaseChange`: (tabId: string, database: string) => Promise<void>
- `handlePageChange`: (tabId: string, page: number) => Promise<void>
- `handlePageSizeChange`: (tabId: string, pageSize: number) => Promise<void>
- `handleSortChange`: (tabId: string, column: string, direction: "asc" | "desc") => Promise<void>
- `handleFilterChange`: (tabId: string, filter: string, orderBy: string) => Promise<void>
- `handleTableRefresh`: (tabId: string, overrides?: any) => Promise<void>
- `handleOpenTableDDL`: (ctx: any) => void
- `handleOpenERDiagram`: (ctx?: any) => void
- `handleCreateQuery`: (connectionId: number, databaseName: string, driver: string) => void
- `handleCloseTab`: (tabId: string) => void
- `handleCreateTableSuccess`: (tabId: string, connectionId: number, database: string, schema: string | undefined, tableName: string, driver: string) => void
- `handleAlterTableSuccess`: (tabId: string) => void
- `notifyRedisRefresh`: (connectionId: number, database: string) => void
- `setQueriesLastUpdated`: (timestamp: number) => void
- `isDefaultQueryTitle`: (title?: string) => boolean

**包含**：
- SqlEditor
- TableView
- RedisKeyView
- 其他标签类型组件

#### 3.3.4 `UnsavedChangesDialog` 组件
**职责**：未保存更改确认对话框
**Props**：
- `isUnsavedConfirmOpen`: boolean
- `isCloseSaveDialogOpen`: boolean
- `onCancel`: () => void
- `onDiscard`: () => void
- `onSave`: () => void
- `onSaveDialogOpenChange`: (open: boolean) => void
- `onSaveComplete`: (name: string, description: string) => Promise<void>

**包含**：
- AlertDialog
- SaveQueryDialog

#### 3.3.5 `WindowActions` 组件
**职责**：窗口操作按钮
**Props**：
- `aiVisible`: boolean
- `setAiVisible`: (visible: boolean) => void
- `setOpenSettings`: (open: boolean) => void

**包含**：
- 设置按钮
- SQL 执行日志
- AI 面板切换

## 4. 数据流设计

### 4.1 状态提升模式
- App 组件作为顶层容器
- 使用 hooks 管理状态和逻辑
- 通过 props 将状态和处理函数传递给子组件

### 4.2 数据流结构
```
App
├── useTabManager → tabs, activeTab, 相关处理函数
├── useQueryEditor → 查询相关处理函数
├── useTableViewer → 表格相关处理函数
├── useUnsavedChanges → 未保存更改处理函数
├── useKeyboardShortcuts → 快捷键设置
│
├── AppLayout
│   ├── TabBar (接收 tabs, activeTab, 处理函数)
│   ├── TabContentRenderer (接收 tabs, activeTab, 所有处理函数)
│   └── UnsavedChangesDialog (接收对话框状态和处理函数)
```

### 4.3 性能优化
- 使用 useCallback 包装所有处理函数，避免不必要的重渲染
- 使用 useMemo 缓存计算结果
- 使用 React.memo 优化子组件
- 保持 props 传递的简洁性

## 5. 实施步骤

### 5.1 阶段 1：创建状态管理 Hooks（优先级：高）
1. 创建 `useTabManager` hook
2. 创建 `useQueryEditor` hook
3. 创建 `useTableViewer` hook
4. 创建 `useUnsavedChanges` hook
5. 创建 `useKeyboardShortcuts` hook

### 5.2 阶段 2：创建 UI 组件（优先级：中）
1. 创建 `AppLayout` 组件
2. 创建 `TabBar` 组件
3. 创建 `TabContentRenderer` 组件
4. 创建 `UnsavedChangesDialog` 组件
5. 创建 `WindowActions` 组件

### 5.3 阶段 3：重构 App.tsx（优先级：高）
1. 导入新的 hooks 和组件
2. 替换 App.tsx 中的状态管理逻辑
3. 替换 App.tsx 中的 UI 渲染逻辑
4. 确保所有功能正常工作

### 5.4 阶段 4：测试和验证（优先级：高）
1. 为新的 hooks 编写单元测试
2. 为新的组件编写集成测试
3. 进行手动测试，确保所有功能正常
4. 运行 lint 和类型检查

## 6. 时间估算

| 阶段 | 预计时间 |
|------|----------|
| 阶段 1：创建状态管理 Hooks | 2-3 小时 |
| 阶段 2：创建 UI 组件 | 1-2 小时 |
| 阶段 3：重构 App.tsx | 2-3 小时 |
| 阶段 4：测试和验证 | 1-2 小时 |
| **总计** | **6-10 小时** |

## 7. 风险评估

### 7.1 低风险
- 重构不会改变功能，只改变代码组织
- 保持现有测试通过

### 7.2 中风险
- 需要确保所有功能正常工作
- 可能需要调整现有测试

### 7.3 高风险
- 需要仔细测试每个阶段
- 可能发现隐藏的依赖关系

## 8. 成功标准

### 8.1 代码质量
- App.tsx 行数减少到 500 行以下
- 每个 hook 和组件职责单一
- 代码可读性和可维护性提高

### 8.2 功能完整性
- 所有现有功能正常工作
- 所有测试通过
- 没有引入新的 bug

### 8.3 性能
- 应用性能没有明显下降
- 内存使用没有明显增加

## 9. 后续优化建议

### 9.1 状态管理库
考虑引入 Zustand 或 Jotai 等轻量级状态管理库，进一步改善状态管理。

### 9.2 API 层重构
将 api.ts 和 mocks.ts 拆分为领域特定的模块。

### 9.3 测试覆盖
添加组件级测试，提高测试覆盖率。

## 10. 结论

通过混合方法拆分 App.tsx，可以显著改善代码的可维护性，同时保持功能完整性。实施过程分为四个阶段，每个阶段都有明确的目标和验证标准。