# RedisKeyView.tsx 拆分实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 1254 行的 `RedisKeyView.tsx` 拆分为 5 个职责单一的文件

**Architecture:** 从底向上拆分——先提取无依赖的工具函数，再提取纯数据逻辑，然后提取 hook，再提取展示组件，最后瘦身主文件。每步完成后验证 TypeScript 编译通过。

**Tech Stack:** React, TypeScript, Tauri

---

## 文件结构

```
src/components/business/Redis/
├── redis-format.ts          (新建) 显示格式化工具函数
├── redis-patch.ts           (新建) patch 构建 + 数据逻辑
├── useRedisKey.ts           (新建) 自定义 hook：state + 业务逻辑
├── RedisKeyFormHeader.tsx   (新建) header + metadata + form
├── RedisKeyView.tsx         (修改) 薄壳：组装 viewer + dialog
├── redis-utils.ts           (不动)
├── redis-type-colors.ts     (不动)
└── value-viewer/*.tsx       (不动)
```

---

### Task 1: 创建 `redis-format.ts`

**Files:**
- Create: `src/components/business/Redis/redis-format.ts`
- Source: `src/components/business/Redis/RedisKeyView.tsx:92-119`

- [ ] **Step 1: 创建 `redis-format.ts`**

```ts
export function formatTtl(ttl: number): string {
  if (ttl === -1) return "No expiry";
  if (ttl <= -2) return "Expired";
  const h = Math.floor(ttl / 3600);
  const m = Math.floor((ttl % 3600) / 60);
  const s = ttl % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatIdleTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}
```

- [ ] **Step 2: 验证编译**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Redis/redis-format.ts
git commit -m "refactor: extract redis-format.ts from RedisKeyView"
```

---

### Task 2: 创建 `redis-patch.ts`

**Files:**
- Create: `src/components/business/Redis/redis-patch.ts`
- Source: `src/components/business/Redis/RedisKeyView.tsx:121-289`

- [ ] **Step 1: 创建 `redis-patch.ts`**

从 `RedisKeyView.tsx` 提取以下 4 个函数，添加 `export`：

```ts
import type { RedisKeyPatchPayload, RedisValue } from "@/services/api";

export function mergeValues(base: RedisValue, next: RedisValue): RedisValue {
  // ... 原 L121-147 完整复制
}

export function isValueUnchanged(a: RedisValue, b: RedisValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function getJsonValidationError(value: RedisValue): string | null {
  if (value.kind !== "json") return null;
  try {
    JSON.parse(value.value);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid JSON";
  }
}

export function buildPatch(
  key: string,
  ttlSeconds: number | null,
  original: RedisValue,
  current: RedisValue,
  originalLoadedCount: number,
): RedisKeyPatchPayload {
  // ... 原 L163-289 完整复制
}
```

- [ ] **Step 2: 验证编译**

Run: `bun run typecheck`
Expected: PASS（新文件未被引用，不影响编译）

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Redis/redis-patch.ts
git commit -m "refactor: extract redis-patch.ts from RedisKeyView"
```

---

### Task 3: 创建 `useRedisKey.ts`

**Files:**
- Create: `src/components/business/Redis/useRedisKey.ts`
- Source: `src/components/business/Redis/RedisKeyView.tsx:291-597`

- [ ] **Step 1: 创建 `useRedisKey.ts` 骨架**

从 `RedisKeyView.tsx` 提取全部 state 和业务逻辑。导入从 `redis-patch.ts` 获取工具函数。

```ts
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type {
  RedisKeyPatchPayload,
  RedisKeyValue,
  RedisValue,
} from "@/services/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { errorMessage, handleApiError } from "@/lib/errors";
import {
  countRedisValueItems,
  isRedisValuePagePartial,
  parseRedisTtlSeconds,
} from "./redis-utils";
import { TYPE_BADGE } from "./redis-type-colors";
import {
  mergeValues,
  isValueUnchanged,
  getJsonValidationError,
  buildPatch,
} from "./redis-patch";

type RedisKind = RedisValue["kind"];

const EDITABLE_KINDS: RedisKind[] = [
  "string", "hash", "list", "set", "zSet", "stream", "json",
];

const KIND_DEFAULT: Record<RedisKind, RedisValue> = {
  string: { kind: "string", value: "" },
  hash: { kind: "hash", value: {} },
  list: { kind: "list", value: [] },
  set: { kind: "set", value: [] },
  zSet: { kind: "zSet", value: [] },
  stream: { kind: "stream", value: [] },
  json: { kind: "json", value: "{}" },
  none: { kind: "none" },
};

interface UseRedisKeyParams {
  connectionId: number;
  database: string;
  redisKey: string;
  onDeleted?: () => void;
  onSavedKeyChange?: (key: string) => void;
}

export function useRedisKey({
  connectionId,
  database,
  redisKey,
  onDeleted,
  onSavedKeyChange,
}: UseRedisKeyParams) {
  const { t } = useTranslation();
  // ... 全部 24 个 state（原 L299-322）
  // ... load（原 L329-365）
  // ... useEffect（原 L367-369）
  // ... handleLoadMore（原 L371-400）
  // ... doSave（原 L402-497）
  // ... handleApplyTtl（原 L499-517）
  // ... handleSave（原 L519-569）
  // ... doDelete（原 L571-575）
  // ... handleConfirm（原 L577-593）
  // ... handleKindChange（原 L595-597）

  const isCreateMode = redisKey.trim().length === 0;
  const jsonValidationError = getJsonValidationError(value);
  const jsonModuleMissing =
    value.kind === "json" && record?.extra?.subtype === "json-module-missing";
  const typeBadge = record ? TYPE_BADGE[record.value.kind] : null;

  return {
    // state + setters
    record, value, setValue,
    originalValue, originalLoadedCount,
    keyName, setKeyName,
    ttl, setTtl,
    isLoading, isSaving,
    pendingAction, setPendingAction,
    valueIsPartial, valueTotalLen,
    loadedOffset, loadedCount,
    isLoadingMore,
    // SET options
    setOptionsExpanded, setSetOptionsExpanded,
    setNx, setSetNx,
    setXx, setSetXx,
    setPx, setSetPx,
    setKeepttl, setSetKeepttl,
    // derived
    isCreateMode, jsonValidationError, jsonModuleMissing, typeBadge,
    // actions
    load, handleLoadMore, handleSave, handleApplyTtl,
    handleConfirm, handleKindChange,
  };
}
```

- [ ] **Step 2: 验证编译**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Redis/useRedisKey.ts
git commit -m "refactor: extract useRedisKey hook from RedisKeyView"
```

---

### Task 4: 创建 `RedisKeyFormHeader.tsx`

**Files:**
- Create: `src/components/business/Redis/RedisKeyFormHeader.tsx`
- Source: `src/components/business/Redis/RedisKeyView.tsx:604-839`

- [ ] **Step 1: 创建 `RedisKeyFormHeader.tsx`**

Props 接口设计——所有数据从外部传入：

```tsx
import {
  Clock, Hash, Loader2, MemoryStick, RefreshCw, Trash2, Box, Timer, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { RedisKeyValue, RedisValue } from "@/services/api";
import { formatTtl, formatBytes, formatIdleTime } from "./redis-format";

type RedisKind = RedisValue["kind"];

interface RedisKeyFormHeaderProps {
  // display
  isCreateMode: boolean;
  redisKey: string;
  record: RedisKeyValue | null;
  typeBadge: { label: string; className: string } | null;
  database: string;
  // key name
  keyName: string;
  onKeyNameChange: (v: string) => void;
  // type
  valueKind: RedisKind;
  onKindChange: (kind: RedisKind) => void;
  // TTL
  ttl: string;
  onTtlChange: (v: string) => void;
  onApplyTtl: () => void;
  isSaving: boolean;
  // metadata
  valueTotalLen: number | null;
  // actions
  onRefresh: () => void;
  onDelete: () => void;
  isLoading: boolean;
  // SET options (create mode + string only)
  setOptionsExpanded: boolean;
  onSetOptionsExpandedChange: (v: boolean) => void;
  setNx: boolean;
  onSetNxChange: (v: boolean) => void;
  setXx: boolean;
  onSetXxChange: (v: boolean) => void;
  setPx: string;
  onSetPxChange: (v: string) => void;
  setKeepttl: boolean;
  onSetKeepttlChange: (v: boolean) => void;
}

export function RedisKeyFormHeader(props: RedisKeyFormHeaderProps) {
  // JSX: 原 L604-839 的 header + metadata bar + edit form + advanced SET options
}
```

- [ ] **Step 2: 验证编译**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Redis/RedisKeyFormHeader.tsx
git commit -m "refactor: extract RedisKeyFormHeader from RedisKeyView"
```

---

### Task 5: 瘦身 `RedisKeyView.tsx`

**Files:**
- Modify: `src/components/business/Redis/RedisKeyView.tsx`
- Source: 全文重写

- [ ] **Step 1: 重写 `RedisKeyView.tsx`**

替换为薄壳组件：

```tsx
import { Loader2, Save } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { RedisBitmapBit } from "@/services/api";
import { useTranslation } from "react-i18next";
import { handleApiError } from "@/lib/errors";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useRedisKey } from "./useRedisKey";
import { RedisKeyFormHeader } from "./RedisKeyFormHeader";
import { RedisStringViewer } from "./value-viewer/RedisStringViewer";
import { RedisHashViewer } from "./value-viewer/RedisHashViewer";
import { RedisListViewer } from "./value-viewer/RedisListViewer";
import { RedisSetViewer } from "./value-viewer/RedisSetViewer";
import { RedisZSetViewer } from "./value-viewer/RedisZSetViewer";
import { RedisStreamViewer } from "./value-viewer/RedisStreamViewer";
import { RedisJsonViewer } from "./value-viewer/RedisJsonViewer";
import { RedisBitmapViewer } from "./value-viewer/RedisBitmapViewer";
import { RedisHyperLogLogViewer } from "./value-viewer/RedisHyperLogLogViewer";
import { RedisGeoViewer } from "./value-viewer/RedisGeoViewer";

interface RedisKeyViewProps {
  connectionId: number;
  database: string;
  redisKey: string;
  onDeleted?: () => void;
  onSavedKeyChange?: (key: string) => void;
}

export function RedisKeyView({
  connectionId, database, redisKey, onDeleted, onSavedKeyChange,
}: RedisKeyViewProps) {
  const { t } = useTranslation();
  const hk = useRedisKey({ connectionId, database, redisKey, onDeleted, onSavedKeyChange });

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
        <RedisKeyFormHeader
          isCreateMode={hk.isCreateMode}
          redisKey={redisKey}
          record={hk.record}
          typeBadge={hk.typeBadge}
          database={database}
          keyName={hk.keyName}
          onKeyNameChange={hk.setKeyName}
          valueKind={hk.value.kind === "none" ? "string" : hk.value.kind}
          onKindChange={hk.handleKindChange}
          ttl={hk.ttl}
          onTtlChange={hk.setTtl}
          onApplyTtl={() => void hk.handleApplyTtl()}
          isSaving={hk.isSaving}
          valueTotalLen={hk.valueTotalLen}
          onRefresh={() => void hk.load()}
          onDelete={() => hk.setPendingAction("delete")}
          isLoading={hk.isLoading}
          setOptionsExpanded={hk.setOptionsExpanded}
          onSetOptionsExpandedChange={hk.setSetOptionsExpanded}
          setNx={hk.setNx}
          onSetNxChange={hk.setSetNx}
          setXx={hk.setXx}
          onSetXxChange={hk.setSetXx}
          setPx={hk.setPx}
          onSetPxChange={hk.setSetPx}
          setKeepttl={hk.setKeepttl}
          onSetKeepttlChange={hk.setSetKeepttl}
        />

        {/* Value viewer */}
        <div className="space-y-2">
          {/* ... 原 L842-1193 的 viewer 条件渲染，回调用 hk 的方法 ... */}
          {/* ... load more 按钮 ... */}
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            onClick={() => void hk.handleSave()}
            disabled={hk.isSaving || Boolean(hk.jsonValidationError) || hk.jsonModuleMissing}
          >
            {hk.isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <AlertDialog
        open={hk.pendingAction !== null}
        onOpenChange={(open) => { if (!open) hk.setPendingAction(null); }}
      >
        {/* ... 原 L1219-1251 的 dialog 内容 ... */}
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: 删除原文件中已提取的函数和代码**

确认以下内容已从 `RedisKeyView.tsx` 中移除：
- `formatTtl`, `formatBytes`, `formatIdleTime`（已在 `redis-format.ts`）
- `mergeValues`, `isValueUnchanged`, `getJsonValidationError`, `buildPatch`（已在 `redis-patch.ts`）
- 所有 state 和业务逻辑（已在 `useRedisKey.ts`）
- Header/metadata/form JSX（已在 `RedisKeyFormHeader.tsx`）

- [ ] **Step 3: 验证编译**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: 验证 lint**

Run: `bun run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Redis/
git commit -m "refactor: slim down RedisKeyView.tsx to thin shell"
```

---

### Task 6: 最终验证

- [ ] **Step 1: 完整类型检查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 2: Lint 检查**

Run: `bun run lint`
Expected: PASS

- [ ] **Step 3: 手动验证**

在浏览器中打开应用，测试：
1. 点击 Redis key → 正确显示 value
2. 编辑 string/hash/list 值 → 保存成功
3. 修改 TTL → Apply 生效
4. 删除 key → 确认 dialog → 删除成功
5. 创建新 key → 选择类型 → 保存成功

- [ ] **Step 4: Final commit (if needed)**

如有修复，单独提交。
