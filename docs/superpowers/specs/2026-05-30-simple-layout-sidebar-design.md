# 简单布局侧边栏精简设计

## 目标

在简单布局（tabs 模式）下，数据库展开后只显示 Tables 分组，隐藏 Views、Functions、Procedures、Events 等所有其他分组，保持界面简洁。

## 背景

项目支持两种侧边栏布局：
- **传统布局（tree 模式）**：类似 Navicat/DataGrip，统一树形结构，包含完整的数据库对象分组
- **简单布局（tabs 模式）**：两个标签页（连接/查询），适合快速切换

当前简单布局的连接标签页仍然显示完整的数据库对象分组（Tables、Views、Functions 等），与传统布局无异。需要精简为只显示 Tables。

## 改动范围

| 文件 | 改动内容 |
|------|----------|
| `src/components/business/Sidebar/Sidebar.tsx` | 传递 `simpleMode` prop 到 ConnectionList |
| `src/components/business/Sidebar/ConnectionList.tsx` | 接收 `simpleMode` prop，过滤 groups 只保留 Tables |

## 具体实现

### 1. Sidebar.tsx

在 tabs 模式下，给 ConnectionList 传递 `simpleMode={true}`：

```tsx
// tabs 模式
<ConnectionList {...connectionListProps} simpleMode />

// tree 模式 - 不传递该 prop（默认 false）
<ConnectionList
  {...connectionListProps}
  onSelectSavedQuery={onSelectSavedQuery}
  lastUpdated={lastUpdated}
  showSavedQueriesInTree
/>
```

### 2. ConnectionList.tsx

新增 prop 并在渲染时过滤 groups：

```tsx
interface ConnectionListProps {
  // ... 现有 props
  simpleMode?: boolean;
}

// 在获取 groups 后过滤
const filteredGroups = simpleMode
  ? groups.filter(g => g.source === "tables" && !g.sourceFilter)
  : groups;
```

过滤逻辑说明：
- `g.source === "tables"` — 只保留数据来源为 tables 的分组
- `!g.sourceFilter` — 排除带过滤器的分组（如 Views、Materialized Views）
- 结果：只保留纯 Tables 分组

## 效果对比

### 简单布局（tabs 模式）- 改动后

```
┌─────────────┬─────────────┐
│  连接       │  查询       │
├─────────────┴─────────────┤
│ ▼ My Connection           │
│   ▼ my_database           │
│     └ Tables              │
│       ├ users             │
│       ├ orders            │
│       └ products          │
│   ▼ another_database      │
│     └ Tables              │
│       └ logs              │
└───────────────────────────┘
```

### 传统布局（tree 模式）- 保持不变

```
┌───────────────────────────┐
│ ▼ My Connection           │
│   ├ Queries               │
│   │ └ my_query.sql        │
│   └ Databases             │
│     ▼ my_database         │
│       ├ Tables            │
│       │ └ users           │
│       ├ Views             │
│       │ └ user_view       │
│       ├ Functions         │
│       │ └ get_user()      │
│       └ Procedures        │
│         └ update_user()   │
└───────────────────────────┘
```

## 不改动的部分

- 传统布局（tree 模式）保持不变
- 后端 API 不需要修改
- 数据获取逻辑不变，只是前端渲染时过滤
- Settings 中的布局选项保持不变
