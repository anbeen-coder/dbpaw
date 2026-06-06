# 简单布局侧边栏精简 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在简单布局（tabs 模式）下，数据库展开后只显示 Tables 分组，隐藏 Views、Functions、Procedures 等所有其他分组。

**Architecture:** 通过在 ConnectionList 组件中添加 `simpleMode` prop，在渲染时过滤 groups 数组，只保留 `source === "tables"` 且无 `sourceFilter` 的分组。

**Tech Stack:** React, TypeScript, Tauri

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/components/business/Sidebar/Sidebar.tsx` | Modify | 传递 `simpleMode` prop |
| `src/components/business/Sidebar/ConnectionList.tsx` | Modify | 接收 prop 并过滤 groups |

---

### Task 1: 在 ConnectionList 中添加 simpleMode 支持

**Files:**
- Modify: `src/components/business/Sidebar/ConnectionList.tsx`

- [ ] **Step 1: 在 ConnectionListProps 接口中添加 simpleMode prop**

找到 `ConnectionListProps` 接口定义（约第 572 行），添加 `simpleMode?: boolean`：

```typescript
interface ConnectionListProps {
  // ... 现有 props
  simpleMode?: boolean;
}
```

- [ ] **Step 2: 在函数参数中解构 simpleMode**

找到 `ConnectionList` 函数的参数解构（约第 600 行），添加 `simpleMode = false`：

```typescript
export function ConnectionList({
  // ... 现有参数
  simpleMode = false,
}: ConnectionListProps) {
```

- [ ] **Step 3: 找到 groups 的使用位置并添加过滤逻辑**

找到 `renderDatabaseNode` 函数中使用 `treeConfig.groups` 的位置（约第 2800-2850 行），在渲染前过滤 groups：

```typescript
const groups = simpleMode
  ? treeConfig.groups.filter(g => g.source === "tables" && !g.sourceFilter)
  : treeConfig.groups;
```

然后将后续代码中使用 `treeConfig.groups` 的地方改为使用 `groups`。

- [ ] **Step 4: 运行类型检查确认无误**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Sidebar/ConnectionList.tsx
git commit -m "feat(sidebar): add simpleMode prop to filter groups in tabs layout"
```

---

### Task 2: 在 Sidebar 中传递 simpleMode prop

**Files:**
- Modify: `src/components/business/Sidebar/Sidebar.tsx`

- [ ] **Step 1: 在 tabs 模式下传递 simpleMode**

找到 Sidebar.tsx 中 tabs 模式渲染 ConnectionList 的位置（约第 166 行），添加 `simpleMode` prop：

```tsx
<ConnectionList {...connectionListProps} simpleMode />
```

- [ ] **Step 2: 运行类型检查确认无误**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 3: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/components/business/Sidebar/Sidebar.tsx
git commit -m "feat(sidebar): enable simpleMode in tabs layout for minimal tree view"
```

---

### Task 3: 验证功能

- [ ] **Step 1: 启动开发服务器**

Run: `npm run tauri dev`

- [ ] **Step 2: 切换到简单布局**

在 Settings → Layout 中选择 "Tabs (Connections/Queries)"

- [ ] **Step 3: 测试数据库展开**

创建一个数据库连接，展开数据库，确认只显示 Tables 分组

- [ ] **Step 4: 测试传统布局不受影响**

切换回 "Tree (Queries under connection)" 布局，确认完整分组仍然显示

- [ ] **Step 5: 测试查询标签页**

确认 Queries 标签页仍然正常工作
