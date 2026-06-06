# Redis i18n + handleApiError Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 43 hardcoded English `toast.error` strings in the Redis module with i18n keys and add a `handleApiError` utility to reduce boilerplate.

**Architecture:** Add a `handleApiError(title, e)` wrapper in `src/lib/errors.ts`, add `redis.*` i18n keys to both locale files, then update 4 Redis component files to use `useTranslation` + `handleApiError`.

**Tech Stack:** TypeScript, react-i18next, sonner (toast)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/errors.ts` | Modify | Add `handleApiError` export |
| `src/lib/i18n/locales/en.ts` | Modify | Add `redis.*` translation keys |
| `src/lib/i18n/locales/zh.ts` | Modify | Add `redis.*` translation keys |
| `src/components/business/Redis/RedisBrowserView.tsx` | Modify | Replace 10 hardcoded toast calls |
| `src/components/business/Redis/RedisKeyView.tsx` | Modify | Replace 17 hardcoded toast calls |
| `src/components/business/Redis/value-viewer/RedisStreamViewer.tsx` | Modify | Replace 12 hardcoded toast calls |
| `src/components/business/Redis/value-viewer/RedisGeoViewer.tsx` | Modify | Replace 4 hardcoded toast calls |

---

### Task 1: Add `handleApiError` utility

**Files:**
- Modify: `src/lib/errors.ts`

- [ ] **Step 1: Add import for toast**

At the top of `src/lib/errors.ts`, add the sonner import after the existing exports:

```typescript
import { toast } from "sonner";
```

- [ ] **Step 2: Add `handleApiError` function**

Append to the end of `src/lib/errors.ts`:

```typescript
/**
 * Show a toast error with the translated title and extracted error description.
 *
 * @example
 * handleApiError(t("redis.key.loadFailed"), e);
 */
export function handleApiError(title: string, e: unknown): void {
  toast.error(title, { description: errorMessage(e) });
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/errors.ts
git commit -m "feat: add handleApiError utility for toast error pattern"
```

---

### Task 2: Add i18n keys to English locale

**Files:**
- Modify: `src/lib/i18n/locales/en.ts`

- [ ] **Step 1: Add `redis` namespace to en.ts**

Add the following block inside the `export const en = { ... }` object, after the existing `connection` block (around line 967, before the closing `};`):

```typescript
  redis: {
    browser: {
      scanFailed: "Failed to scan keys",
      loadDatabasesFailed: "Failed to load Redis databases",
      batchKeysFailed: "{{count}} key(s) failed",
      batchOperationFailed: "Batch operation failed",
      mgetFailed: "MGET failed",
      invalidFormat: "Invalid format",
      msetFailed: "MSET failed",
      readFileFailed: "Failed to read file",
      copyFailed: "Copy failed",
      exportFailed: "Export failed",
    },
    key: {
      loadFailed: "Failed to load Redis key",
      loadMoreFailed: "Failed to load more items",
      invalidTtl: "Invalid TTL",
      updateTtlFailed: "Failed to update TTL",
      saveFailed: "Failed to save Redis key",
      operationFailed: "Operation failed",
      bitmapUpdateFailed: "Failed to update bitmap",
      incrementFailed: "Failed to increment",
      scoreUpdateFailed: "Failed to update score",
      popMinFailed: "Failed to pop min",
      popMaxFailed: "Failed to pop max",
    },
    stream: {
      invalidRange: "Invalid stream range",
      loadFailed: "Failed to load stream entries",
      loadMoreFailed: "Failed to load more stream entries",
      createGroupFailed: "Failed to create group",
      deleteGroupFailed: "Failed to delete group",
      resetCursorFailed: "Failed to reset group cursor",
      loadPendingFailed: "Failed to load pending info",
      loadPendingEntriesFailed: "Failed to load pending entries",
      acknowledgeFailed: "Failed to acknowledge",
      claimFailed: "Failed to claim entry",
      trimFailed: "Failed to trim stream",
      selectGroupRequired: "Please select a group and enter a consumer name",
      readFromGroupFailed: "Failed to read from consumer group",
    },
    geo: {
      lookupFailed: "Failed to lookup coordinates",
      addFailed: "Failed to add location",
      distanceFailed: "Failed to calculate distance",
      nearbyFailed: "Failed to search nearby locations",
    },
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (en.ts is the source of truth for the `Translations` type)

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/locales/en.ts
git commit -m "feat: add redis i18n keys to English locale"
```

---

### Task 3: Add i18n keys to Chinese locale

**Files:**
- Modify: `src/lib/i18n/locales/zh.ts`

- [ ] **Step 1: Add `redis` namespace to zh.ts**

Add the following block inside the `export const zh: Translations = { ... }` object, after the existing `connection` block (around line 933, before the closing `};`):

```typescript
  redis: {
    browser: {
      scanFailed: "扫描键失败",
      loadDatabasesFailed: "加载 Redis 数据库失败",
      batchKeysFailed: "{{count}} 个键加载失败",
      batchOperationFailed: "批量操作失败",
      mgetFailed: "MGET 失败",
      invalidFormat: "格式无效",
      msetFailed: "MSET 失败",
      readFileFailed: "读取文件失败",
      copyFailed: "复制失败",
      exportFailed: "导出失败",
    },
    key: {
      loadFailed: "加载 Redis 键失败",
      loadMoreFailed: "加载更多项失败",
      invalidTtl: "TTL 无效",
      updateTtlFailed: "更新 TTL 失败",
      saveFailed: "保存 Redis 键失败",
      operationFailed: "操作失败",
      bitmapUpdateFailed: "更新位图失败",
      incrementFailed: "递增失败",
      scoreUpdateFailed: "更新分数失败",
      popMinFailed: "弹出最小值失败",
      popMaxFailed: "弹出最大值失败",
    },
    stream: {
      invalidRange: "流范围无效",
      loadFailed: "加载流条目失败",
      loadMoreFailed: "加载更多流条目失败",
      createGroupFailed: "创建消费组失败",
      deleteGroupFailed: "删除消费组失败",
      resetCursorFailed: "重置消费组游标失败",
      loadPendingFailed: "加载待处理信息失败",
      loadPendingEntriesFailed: "加载待处理条目失败",
      acknowledgeFailed: "确认消息失败",
      claimFailed: "认领条目失败",
      trimFailed: "裁剪流失败",
      selectGroupRequired: "请选择消费组并输入消费者名称",
      readFromGroupFailed: "从消费组读取失败",
    },
    geo: {
      lookupFailed: "查询坐标失败",
      addFailed: "添加位置失败",
      distanceFailed: "计算距离失败",
      nearbyFailed: "搜索附近位置失败",
    },
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (zh.ts imports `Translations` type from en.ts, so missing keys cause compile errors)

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/locales/zh.ts
git commit -m "feat: add redis i18n keys to Chinese locale"
```

---

### Task 4: Update RedisBrowserView.tsx

**Files:**
- Modify: `src/components/business/Redis/RedisBrowserView.tsx`

- [ ] **Step 1: Add useTranslation import**

Change line 1 from:
```typescript
import { useCallback, useEffect, useState } from "react";
```
To:
```typescript
import { useCallback, useEffect, useState } from "react";
```
(No change needed — `useTranslation` will be imported separately)

Add after line 43 (`import { errorMessage } from "@/lib/errors";`):
```typescript
import { useTranslation } from "react-i18next";
```

Change line 43 from:
```typescript
import { errorMessage } from "@/lib/errors";
```
To:
```typescript
import { handleApiError } from "@/lib/errors";
```

- [ ] **Step 2: Add useTranslation hook inside the component**

After line 70 (`}: Props) {`), add:
```typescript
  const { t } = useTranslation();
```

- [ ] **Step 3: Replace all 10 toast.error calls**

**Line 122-124** (scan catch block):
```typescript
// Before:
        toast.error("Failed to scan keys", {
          description: errorMessage(e),
        });
// After:
        handleApiError(t("redis.browser.scanFailed"), e);
```

**Line 149-151** (init catch block):
```typescript
// Before:
        toast.error("Failed to load Redis databases", {
          description: errorMessage(e),
        });
// After:
        handleApiError(t("redis.browser.loadDatabasesFailed"), e);
```

**Line 242** (batch op failed count):
```typescript
// Before:
        toast.error(`${failed.length} key(s) failed`);
// After:
        handleApiError(t("redis.browser.batchKeysFailed", { count: failed.length }), e);
```
Note: This call currently has no `e` in scope — it's inside `if (failed.length > 0)` but not in a catch. Change to just `toast.error(t("redis.browser.batchKeysFailed", { count: failed.length }))` since there's no error object here. Actually, looking at the code more carefully, this is in the `runBatchOp` function's try block, not in a catch. So use:
```typescript
        toast.error(t("redis.browser.batchKeysFailed", { count: failed.length }));
```

**Line 253-255** (batch op catch):
```typescript
// Before:
      toast.error("Batch operation failed", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.browser.batchOperationFailed"), e);
```

**Line 271-273** (MGET catch):
```typescript
// Before:
      toast.error("MGET failed", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.browser.mgetFailed"), e);
```

**Line 282-284** (invalid format):
```typescript
// Before:
      toast.error("Invalid format", {
        description: "Expected JSON object or lines of key:value",
      });
// After:
      toast.error(t("redis.browser.invalidFormat"), {
        description: "Expected JSON object or lines of key:value",
      });
```
Note: This call has a hardcoded description, not `errorMessage(e)`. Keep the description as-is since it's a format hint, not an error.

**Line 296-298** (MSET catch):
```typescript
// Before:
      toast.error("MSET failed", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.browser.msetFailed"), e);
```

**Line 320-322** (read file catch):
```typescript
// Before:
      toast.error("Failed to read file", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.browser.readFileFailed"), e);
```

**Line 672** (copy failed):
```typescript
// Before:
                    toast.error("Copy failed");
// After:
                    toast.error(t("redis.browser.copyFailed"));
```
Note: This has no error object, so can't use `handleApiError`.

**Line 696-698** (export catch):
```typescript
// Before:
                    toast.error("Export failed", {
                      description: errorMessage(e),
                    });
// After:
                    handleApiError(t("redis.browser.exportFailed"), e);
```

- [ ] **Step 4: Remove unused toast import if no longer needed**

Check if `toast` is still used directly (yes — for `toast.success` calls and the two special cases above). Keep the import.

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/business/Redis/RedisBrowserView.tsx
git commit -m "feat: i18n RedisBrowserView toast.error calls"
```

---

### Task 5: Update RedisKeyView.tsx

**Files:**
- Modify: `src/components/business/Redis/RedisKeyView.tsx`

- [ ] **Step 1: Add useTranslation import**

After line 42 (`import { errorMessage } from "@/lib/errors";`), add:
```typescript
import { useTranslation } from "react-i18next";
```

Change line 42 from:
```typescript
import { errorMessage } from "@/lib/errors";
```
To:
```typescript
import { handleApiError } from "@/lib/errors";
```

- [ ] **Step 2: Add useTranslation hook inside the component**

After line 296 (`}: RedisKeyViewProps) {`), add:
```typescript
  const { t } = useTranslation();
```

- [ ] **Step 3: Replace all 17 toast.error calls**

**Line 359-361** (load catch):
```typescript
// Before:
      toast.error("Failed to load Redis key", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.key.loadFailed"), e);
```

**Line 396-398** (load more catch):
```typescript
// Before:
      toast.error("Failed to load more items", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.key.loadMoreFailed"), e);
```

**Line 506-508** (invalid TTL):
```typescript
// Before:
      toast.error("Invalid TTL", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.key.invalidTtl"), e);
```

**Line 517-519** (update TTL catch):
```typescript
// Before:
      toast.error("Failed to update TTL", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.key.updateTtlFailed"), e);
```

**Line 527-529** (save - JSON validation error):
```typescript
// Before:
      toast.error("Failed to save Redis key", {
        description: `Invalid JSON: ${jsonValidationError}`,
      });
// After:
      toast.error(t("redis.key.saveFailed"), {
        description: `Invalid JSON: ${jsonValidationError}`,
      });
```
Note: Custom description, can't use handleApiError.

**Line 533-535** (save - module missing):
```typescript
// Before:
      toast.error("Failed to save Redis key", {
        description:
          "RedisJSON module is unavailable for this key. Saving is disabled.",
      });
// After:
      toast.error(t("redis.key.saveFailed"), {
        description:
          "RedisJSON module is unavailable for this key. Saving is disabled.",
      });
```
Note: Custom description, can't use handleApiError.

**Line 544-546** (save catch - create mode):
```typescript
// Before:
        toast.error("Failed to save Redis key", {
          description: errorMessage(e),
        });
// After:
        handleApiError(t("redis.key.saveFailed"), e);
```

**Line 555-557** (save catch - TTL parse):
```typescript
// Before:
      toast.error("Failed to save Redis key", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.key.saveFailed"), e);
```

**Line 568-570** (save catch - patch/overwrite):
```typescript
// Before:
        toast.error("Failed to save Redis key", {
          description: errorMessage(e),
        });
// After:
        handleApiError(t("redis.key.saveFailed"), e);
```

**Line 600-602** (confirm catch):
```typescript
// Before:
      toast.error("Operation failed", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.key.operationFailed"), e);
```

**Line 874-876** (bitmap patch catch):
```typescript
// Before:
                  toast.error("Failed to update bitmap", {
                    description: errorMessage(e),
                  });
// After:
                  handleApiError(t("redis.key.bitmapUpdateFailed"), e);
```

**Line 912-914** (incrBy catch):
```typescript
// Before:
                    toast.error("Failed to increment", {
                      description: errorMessage(e),
                    });
// After:
                    handleApiError(t("redis.key.incrementFailed"), e);
```

**Line 927-929** (incrByInt catch):
```typescript
// Before:
                    toast.error("Failed to increment", {
                      description: errorMessage(e),
                    });
// After:
                    handleApiError(t("redis.key.incrementFailed"), e);
```

**Line 948-950** (hash incrBy catch):
```typescript
// Before:
                  toast.error("Failed to increment", {
                    description: errorMessage(e),
                  });
// After:
                  handleApiError(t("redis.key.incrementFailed"), e);
```

**Line 1090-1092** (zset incrBy catch):
```typescript
// Before:
                  toast.error("Failed to update score", {
                    description: errorMessage(e),
                  });
// After:
                  handleApiError(t("redis.key.scoreUpdateFailed"), e);
```

**Line 1154-1156** (zpopmin catch):
```typescript
// Before:
                  toast.error("Failed to pop min", {
                    description: errorMessage(e),
                  });
// After:
                  handleApiError(t("redis.key.popMinFailed"), e);
```

**Line 1170-1172** (zpopmax catch):
```typescript
// Before:
                  toast.error("Failed to pop max", {
                    description: errorMessage(e),
                  });
// After:
                  handleApiError(t("redis.key.popMaxFailed"), e);
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Redis/RedisKeyView.tsx
git commit -m "feat: i18n RedisKeyView toast.error calls"
```

---

### Task 6: Update RedisStreamViewer.tsx

**Files:**
- Modify: `src/components/business/Redis/value-viewer/RedisStreamViewer.tsx`

- [ ] **Step 1: Add useTranslation import**

After line 65 (`import { errorMessage } from "@/lib/errors";`), add:
```typescript
import { useTranslation } from "react-i18next";
```

Change line 65 from:
```typescript
import { errorMessage } from "@/lib/errors";
```
To:
```typescript
import { handleApiError } from "@/lib/errors";
```

- [ ] **Step 2: Add useTranslation hook inside the component**

After line 189 (`}: Props) {`), add:
```typescript
  const { t } = useTranslation();
```

- [ ] **Step 3: Replace all 12 toast.error calls**

**Line 286-288** (invalid stream range):
```typescript
// Before:
      toast.error("Invalid stream range", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.stream.invalidRange"), e);
```

**Line 316-320** (load stream entries - conditional):
```typescript
// Before:
      toast.error(
        mode === "append"
          ? "Failed to load more stream entries"
          : "Failed to load stream entries",
        { description: errorMessage(e) },
      );
// After:
      handleApiError(
        mode === "append"
          ? t("redis.stream.loadMoreFailed")
          : t("redis.stream.loadFailed"),
        e,
      );
```

**Line 369-371** (create group catch):
```typescript
// Before:
      toast.error("Failed to create group", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.stream.createGroupFailed"), e);
```

**Line 398-400** (delete group catch):
```typescript
// Before:
      toast.error("Failed to delete group", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.stream.deleteGroupFailed"), e);
```

**Line 418-420** (reset group cursor catch):
```typescript
// Before:
      toast.error("Failed to reset group cursor", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.stream.resetCursorFailed"), e);
```

**Line 449-451** (load pending info catch):
```typescript
// Before:
        toast.error("Failed to load pending info", {
          description: errorMessage(e),
        });
// After:
        handleApiError(t("redis.stream.loadPendingFailed"), e);
```

**Line 476-478** (load pending entries catch):
```typescript
// Before:
      toast.error("Failed to load pending entries", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.stream.loadPendingEntriesFailed"), e);
```

**Line 499-501** (ack catch):
```typescript
// Before:
      toast.error("Failed to acknowledge", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.stream.acknowledgeFailed"), e);
```

**Line 524-526** (claim catch):
```typescript
// Before:
      toast.error("Failed to claim entry", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.stream.claimFailed"), e);
```

**Line 545-547** (trim catch):
```typescript
// Before:
      toast.error("Failed to trim stream", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.stream.trimFailed"), e);
```

**Line 555** (xreadgroup validation):
```typescript
// Before:
      toast.error("Please select a group and enter a consumer name");
// After:
      toast.error(t("redis.stream.selectGroupRequired"));
```
Note: No error object, can't use handleApiError.

**Line 572-574** (xreadgroup catch):
```typescript
// Before:
      toast.error("Failed to read from consumer group", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.stream.readFromGroupFailed"), e);
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Redis/value-viewer/RedisStreamViewer.tsx
git commit -m "feat: i18n RedisStreamViewer toast.error calls"
```

---

### Task 7: Update RedisGeoViewer.tsx

**Files:**
- Modify: `src/components/business/Redis/value-viewer/RedisGeoViewer.tsx`

- [ ] **Step 1: Add useTranslation import**

After line 27 (`import { errorMessage } from "@/lib/errors";`), add:
```typescript
import { useTranslation } from "react-i18next";
```

Change line 27 from:
```typescript
import { errorMessage } from "@/lib/errors";
```
To:
```typescript
import { handleApiError } from "@/lib/errors";
```

- [ ] **Step 2: Add useTranslation hook inside the component**

After line 54 (`}: Props) {`), add:
```typescript
  const { t } = useTranslation();
```

- [ ] **Step 3: Replace all 4 toast.error calls**

**Line 117-119** (lookup coordinates catch):
```typescript
// Before:
        toast.error("Failed to lookup coordinates", {
          description: errorMessage(e),
        });
// After:
        handleApiError(t("redis.geo.lookupFailed"), e);
```

**Line 161-163** (add location catch):
```typescript
// Before:
      toast.error("Failed to add location", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.geo.addFailed"), e);
```

**Line 186-188** (calculate distance catch):
```typescript
// Before:
      toast.error("Failed to calculate distance", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.geo.distanceFailed"), e);
```

**Line 217-219** (search nearby catch):
```typescript
// Before:
      toast.error("Failed to search nearby locations", {
        description: errorMessage(e),
      });
// After:
      handleApiError(t("redis.geo.nearbyFailed"), e);
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Redis/value-viewer/RedisGeoViewer.tsx
git commit -m "feat: i18n RedisGeoViewer toast.error calls"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Verify no remaining hardcoded Redis toast.error strings**

Run: `rg 'toast\.error\("' src/components/business/Redis/`
Expected: Only the 2 special cases that can't use handleApiError (invalidFormat with custom description, selectGroupRequired without error object)

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final i18n cleanup for Redis module"
```
