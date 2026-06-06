# TableView 500 行滚动性能优化 — P0 方案

## 问题

`TableView.tsx`（2,919 行）在展示 500+ 行数据时滚动卡顿。根因：

1. **无虚拟滚动**：所有行渲染为完整 DOM（500 行 × 10 列 = 5,000+ `<td>`）
2. **每行独立 ContextMenu**：500 个 Radix ContextMenu 实例，每个创建事件监听和 portal

## 方案概览

| 改动 | 效果 |
|------|------|
| 引入 `@tanstack/react-virtual` | 只渲染视口内 ~20-30 行，DOM 减少 95% |
| ContextMenu 改为全局单例 | 消除 500 个 ContextMenu 实例开销 |

---

## 一、虚拟滚动

### 技术选型

`@tanstack/react-virtual` — 最流行的 React 虚拟化库，支持动态行高，与原生 `<table>` 兼容。

### 实现方式

在 `TableView.tsx` 的 **table view mode**（非 column view）中，用 `useVirtualizer` 包装 `<tbody>` 的行渲染：

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

// 在组件内部
const parentRef = useRef<HTMLDivElement>(null); // 指向 scroll 容器

const virtualizer = useVirtualizer({
  count: currentData.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 36, // 每行估算高度 (py-2 + text-sm ≈ 32-36px)
  overscan: 20,           // 视口外多渲染 20 行，保证滚动流畅
});
```

### 关键改动点

1. **scroll 容器 ref**：给 `flex-1 overflow-auto` 的 div 加上 `ref={parentRef}`
2. **tbody 替换**：用虚拟化方式渲染行，保持 `<table>` + sticky `<thead>` 不变
3. **行高**：使用固定估算高度（36px），因为单元格内容截断（`truncate`），行高一致
4. **横向滚动**：保持现有 `tableWidthPx` 计算逻辑不变，虚拟化仅影响纵向

### `<tbody>` 改造

```tsx
<tbody>
  {/* spacer row for total scroll height */}
  <tr>
    <td
      colSpan={columns.length + (showRowNumbers ? 1 : 0)}
      style={{ height: virtualizer.getTotalSize() }}
    />
  </tr>
  {virtualizer.getVirtualItems().map((virtualRow) => {
    const rowIndex = virtualRow.index;
    const row = currentData[rowIndex];
    if (!row || typeof row !== "object") return null;

    return (
      <tr
        key={rowIndex}
        data-index={rowIndex}
        ref={virtualizer.measureElement}
        style={{
          position: "absolute",
          top: 0,
          transform: `translateY(${virtualRow.start}px)`,
          width: "100%",
        }}
        className={[...].filter(Boolean).join(" ")}
      >
        {/* 单元格渲染保持不变 */}
      </tr>
    );
  })}
</tbody>
```

> **注意**：如果用 `position: absolute` 行，需要给 `<tbody>` 设 `position: relative`，并且 table 需要改为 `display: block` 或者用 spacer 方案。实际实现中建议采用 **spacer row** 方案（在 tbody 顶部放一个 tall `<tr>` 占位），行用正常 flow 渲染，这样 sticky header 和 table layout 都不受影响。

### 推荐方案：Spacer + 正常 flow

```tsx
<tbody>
  <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}>
    <td colSpan={columns.length + (showRowNumbers ? 1 : 0)} />
  </tr>
  {virtualizer.getVirtualItems().map((virtualRow) => {
    const rowIndex = virtualRow.index;
    const row = currentData[rowIndex];
    // ... 渲染行，正常 <tr> flow
  })}
  <tr style={{ height: virtualizer.getTotalSize() - (virtualizer.getVirtualItems().slice(-1)[0]?.end ?? 0) }}>
    <td colSpan={columns.length + (showRowNumbers ? 1 : 0)} />
  </tr>
</tbody>
```

这种方式不需要 absolute positioning，保留原生 table 布局。

### 需要保持的功能兼容

- [x] sticky `<thead>` — spacer 方案不影响
- [x] 列宽拖拽调整 — 不影响（colgroup 不变）
- [x] 行选中 / 单元格选中 — `rowIndex` 保持原值，逻辑不变
- [x] 右键菜单 — 改为全局单例后（见第二节），不受虚拟化影响
- [x] 行号显示 — `startIndex + rowIndex + 1` 保持不变
- [x] 搜索高亮 — matchedCellKeys 用原始 rowIndex，不变
- [x] column view mode — 不受影响，不加虚拟化

---

## 二、ContextMenu 全局单例

### 当前问题

```tsx
{currentData.map((row, rowIndex) => (
  <ContextMenu key={rowIndex}>           // 500 个实例
    <ContextMenuTrigger asChild>
      <tr>...</tr>
    </ContextMenuTrigger>
    <ContextMenuContent>...</ContextMenuContent>  // 每个 ~120 行 JSX
  </ContextMenu>
))}
```

### 改造方案

在 `<table>` 外层包裹 **一个** `<ContextMenu>`，通过 `onOpenChange` 捕获右键行索引，动态渲染菜单内容：

```tsx
const [contextMenuRow, setContextMenuRow] = useState<number | null>(null);

// 包裹整个 table
<ContextMenu onOpenChange={(open) => { if (!open) setContextMenuRow(null); }}>
  <table className="border-collapse table-fixed" style={{ width: tableWidthPx }}>
    <thead>...</thead>
    <tbody>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const rowIndex = virtualRow.index;
        const row = currentData[rowIndex];
        return (
          <tr
            key={rowIndex}
            onContextMenu={() => setContextMenuRow(rowIndex)}
            // 不再包裹 ContextMenu / ContextMenuTrigger
          >
            {/* 单元格内容完全不变 */}
          </tr>
        );
      })}
    </tbody>
  </table>

  {/* 全局右键菜单 — 只渲染一次 */}
  <ContextMenuContent>
    {contextMenuRow !== null && renderContextMenuItems(contextMenuRow)}
  </ContextMenuContent>
</ContextMenu>
```

### 菜单内容提取

将当前内联在 `.map()` 中的 ~120 行菜单 JSX 提取为独立函数：

```tsx
function renderContextMenuItems(rowIndex: number) {
  // 所有当前的 filter / copy / undo 菜单项
  // 使用 contextMenuRow 而非闭包中的 rowIndex
}
```

### 需要注意的点

- `ContextMenuTrigger` 需要 `asChild` 包裹触发元素。改为全局后，触发元素是整个 `<tbody>` 或 `<table>`
- Radix `ContextMenu` 的 `onOpenChange` 回调可以检测打开/关闭状态
- 菜单内容依赖的 `selectedCell`、`selectedRows`、`pendingChanges` 等状态都是组件级的，不需要改动

---

## 三、实施步骤

### Step 1: 安装依赖

```bash
npm install @tanstack/react-virtual
```

### Step 2: 实现虚拟滚动

1. 在 `TableView.tsx` 顶部 import `useVirtualizer`
2. 添加 `parentRef` ref 绑定到 scroll 容器 div
3. 创建 `virtualizer` 实例
4. 改造 table view mode 的 `<tbody>` 为虚拟化渲染
5. 保持 column view mode 不变

### Step 3: ContextMenu 改为单例

1. 将 `<ContextMenu>` 提升到 `<table>` 外层
2. 添加 `contextMenuRow` state
3. 在 `<tr>` 上用 `onContextMenu` 设置行索引
4. 提取菜单内容为 `renderContextMenuItems(rowIndex)` 函数
5. 移除每行的 `<ContextMenu>` / `<ContextMenuTrigger>` 包裹

### Step 4: 验证

- `cargo check`（Rust 侧无改动，跳过）
- `npm run typecheck` / `npm run lint`
- 手动测试：加载 500+ 行数据，验证滚动流畅度
- 验证功能：右键菜单、行选中、单元格编辑、搜索高亮、列宽调整、复制导出

---

## 四、预期效果

| 指标 | 改造前 | 改造后 |
|------|--------|--------|
| DOM 节点数（500行×10列） | ~6,000+ | ~400-600 |
| ContextMenu 实例数 | 500 | 1 |
| 滚动帧率 | 明显卡顿 | 60fps |
| 首次渲染时间 | 长 | 显著缩短 |
