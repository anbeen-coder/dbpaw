# RedisKeyView.tsx 拆分设计

## 背景

`RedisKeyView.tsx`（1254 行）职责过多：格式化、patch 构建、24 个 state、10 种 viewer 渲染、4 种 dialog action。需要按职责拆分为 5 个文件。

## 拆分方案

### 文件 1: `redis-format.ts`（新建，~30 行）

纯显示格式化工具函数，零依赖：

- `formatTtl(ttl: number): string` — TTL 秒数 → 人类可读
- `formatBytes(bytes: number): string` — 字节数 → 可读
- `formatIdleTime(seconds: number): string` — idle 秒数 → 可读

### 文件 2: `redis-patch.ts`（新建，~160 行）

纯数据逻辑，无 UI 依赖。从 `RedisKeyView.tsx` 提取：

- `mergeValues(base: RedisValue, next: RedisValue): RedisValue` — 分页加载时合并值
- `isValueUnchanged(a: RedisValue, b: RedisValue): boolean` — dirty check（JSON.stringify 比较）
- `getJsonValidationError(value: RedisValue): string | null` — JSON 校验
- `buildPatch(key, ttlSeconds, original, current, originalLoadedCount): RedisKeyPatchPayload` — 为每种 Redis 类型构建增量 patch

### 文件 3: `useRedisKey.ts`（新建，自定义 hook，~300 行）

包含全部 state 和业务逻辑。

**Props 入参：**
```ts
interface UseRedisKeyParams {
  connectionId: number;
  database: string;
  redisKey: string;
  onDeleted?: () => void;
  onSavedKeyChange?: (key: string) => void;
}
```

**State（24 个）：**
- `record`, `value`, `originalValue`, `originalLoadedCount`
- `keyName`, `ttl`
- `isLoading`, `isSaving`, `pendingAction`
- `valueIsPartial`, `valueTotalLen`, `loadedOffset`, `loadedCount`, `isLoadingMore`
- `setOptionsExpanded`, `setNx`, `setXx`, `setPx`, `setKeepttl`

**方法：**
- `load()` — 加载 key 数据
- `handleLoadMore()` — 分页加载更多
- `doSave(forceRename?)` — 核心保存逻辑
- `handleApplyTtl()` — 仅更新 TTL
- `handleSave()` — 保存按钮处理（含验证和 dialog 触发）
- `doDelete()` — 删除 key
- `handleConfirm()` — dialog 确认
- `handleKindChange(kind)` — 创建模式下切换类型

**派生值：**
- `isCreateMode`, `jsonValidationError`, `jsonModuleMissing`, `typeBadge`

**返回值：** 所有 state + setter + 方法 + 派生值，供组件消费。

### 文件 4: `RedisKeyFormHeader.tsx`（新建，~240 行）

展示型组件，所有数据通过 props 传入。包含：

- Header 区域（标题 + type badge + Refresh/Delete 按钮）
- Metadata bar（TTL / total / encoding / memory / idle / refs）
- Edit form（Key name / Type selector / TTL + Apply 按钮）
- Advanced SET options（NX/XX/PX/KEEPTTL，仅创建模式 + string 类型时显示）

### 文件 5: `RedisKeyView.tsx`（瘦身，~350 行）

薄壳组件，负责组装：

1. 调用 `useRedisKey()` 获取全部状态和方法
2. 渲染 `<RedisKeyFormHeader />`
3. 渲染 value viewers（条件分发到 10 种 viewer）
4. 渲染 Save button
5. 渲染 `<AlertDialog />`

## 依赖关系

```
RedisKeyView.tsx
  ├── useRedisKey.ts
  │     ├── redis-patch.ts
  │     └── redis-utils.ts（已有，不改）
  ├── RedisKeyFormHeader.tsx
  │     └── redis-format.ts
  └── value-viewer/*.tsx（已有，不改）
        └── redis-format.ts（如需）
```

## 不变的部分

- `redis-utils.ts` — 不改动
- `redis-type-colors.ts` — 不改动
- `value-viewer/*.tsx` — 所有 viewer 组件不改动
- viewer 的 props 接口不变，`useRedisKey` 返回的方法签名与现有回调一致

## 预期行数

| 文件 | 预估行数 |
|------|---------|
| `redis-format.ts` | ~30 |
| `redis-patch.ts` | ~160 |
| `useRedisKey.ts` | ~300 |
| `RedisKeyFormHeader.tsx` | ~240 |
| `RedisKeyView.tsx` | ~350 |
| 合计 | ~1080 |
