# Redis i18n + handleApiError Utility

## Problem

43 `toast.error()` calls in the Redis module use hardcoded English strings, completely bypassing the i18n system. The same `toast.error("Failed to ...", { description: errorMessage(e) })` pattern is repeated dozens of times across 4 files.

## Scope

- Redis module only (4 files, 43 hardcoded calls)
- New `handleApiError` utility for the repeated pattern
- i18n keys in `en.ts` and `zh.ts`

## Design

### 1. New utility: `handleApiError`

Add to `src/lib/errors.ts`:

```typescript
import { toast } from "sonner";

export function handleApiError(title: string, e: unknown): void {
  toast.error(title, { description: errorMessage(e) });
}
```

- Takes an already-translated string (caller uses `t()`)
- Wraps the repeated `toast.error(title, { description: errorMessage(e) })` pattern
- No i18n coupling — caller controls the translation

### 2. i18n key namespace: `redis.*`

Flat keys organized by component area, consistent with existing `connection.*` pattern.

#### `redis.browser.*` (RedisBrowserView.tsx)

| Key | English |
|-----|---------|
| `redis.browser.scanFailed` | Failed to scan keys |
| `redis.browser.loadDatabasesFailed` | Failed to load Redis databases |
| `redis.browser.batchKeysFailed` | Some keys failed to load |
| `redis.browser.mgetFailed` | MGET failed |
| `redis.browser.invalidFormat` | Invalid format |
| `redis.browser.msetFailed` | MSET failed |
| `redis.browser.readFileFailed` | Failed to read file |
| `redis.browser.copyFailed` | Copy failed |
| `redis.browser.exportFailed` | Export failed |

#### `redis.key.*` (RedisKeyView.tsx)

| Key | English |
|-----|---------|
| `redis.key.loadFailed` | Failed to load Redis key |
| `redis.key.loadMoreFailed` | Failed to load more items |
| `redis.key.invalidTtl` | Invalid TTL |
| `redis.key.updateTtlFailed` | Failed to update TTL |
| `redis.key.saveFailed` | Failed to save Redis key |
| `redis.key.operationFailed` | Operation failed |
| `redis.key.bitmapUpdateFailed` | Failed to update bitmap |
| `redis.key.incrementFailed` | Failed to increment |
| `redis.key.scoreUpdateFailed` | Failed to update score |
| `redis.key.popMinFailed` | Failed to pop min |
| `redis.key.popMaxFailed` | Failed to pop max |

#### `redis.stream.*` (RedisStreamViewer.tsx)

| Key | English |
|-----|---------|
| `redis.stream.invalidRange` | Invalid stream range |
| `redis.stream.loadFailed` | Failed to load stream entries |
| `redis.stream.loadMoreFailed` | Failed to load more stream entries |
| `redis.stream.createGroupFailed` | Failed to create group |
| `redis.stream.deleteGroupFailed` | Failed to delete group |
| `redis.stream.resetCursorFailed` | Failed to reset group cursor |
| `redis.stream.loadPendingFailed` | Failed to load pending info |
| `redis.stream.loadPendingEntriesFailed` | Failed to load pending entries |
| `redis.stream.acknowledgeFailed` | Failed to acknowledge |
| `redis.stream.claimFailed` | Failed to claim entry |
| `redis.stream.trimFailed` | Failed to trim stream |
| `redis.stream.selectGroupRequired` | Please select a group and enter a consumer name |
| `redis.stream.readFromGroupFailed` | Failed to read from consumer group |

#### `redis.geo.*` (RedisGeoViewer.tsx)

| Key | English |
|-----|---------|
| `redis.geo.lookupFailed` | Failed to lookup coordinates |
| `redis.geo.addFailed` | Failed to add location |
| `redis.geo.distanceFailed` | Failed to calculate distance |
| `redis.geo.nearbyFailed` | Failed to search nearby locations |

### 3. Files to modify

| File | Hardcoded calls | Changes |
|------|----------------|---------|
| `src/lib/errors.ts` | 0 | Add `handleApiError` export |
| `src/lib/i18n/locales/en.ts` | 0 | Add `redis.*` keys |
| `src/lib/i18n/locales/zh.ts` | 0 | Add `redis.*` keys |
| `src/components/business/Redis/RedisBrowserView.tsx` | 10 | Add `useTranslation`, replace all |
| `src/components/business/Redis/RedisKeyView.tsx` | 17 | Add `useTranslation`, replace all |
| `src/components/business/Redis/value-viewer/RedisStreamViewer.tsx` | 12 | Add `useTranslation`, replace all |
| `src/components/business/Redis/value-viewer/RedisGeoViewer.tsx` | 4 | Add `useTranslation`, replace all |

### 4. Migration pattern

Before:
```typescript
import { errorMessage } from "@/lib/errors";

toast.error("Failed to load Redis key", {
  description: errorMessage(e),
});
```

After:
```typescript
import { useTranslation } from "react-i18next";
import { handleApiError } from "@/lib/errors";

const { t } = useTranslation();
// ...
handleApiError(t("redis.key.loadFailed"), e);
```

### 5. Template literal cases

3 calls use template literals with counts:
```typescript
toast.error(`${failed.length} key(s) failed to load`);
```

These become:
```typescript
// Use i18n interpolation
handleApiError(t("redis.browser.batchKeysFailed", { count: failed.length }), e);
```

Add to en.ts:
```typescript
"redis.browser.batchKeysFailed": "{{count}} key(s) failed to load"
```

### 6. Conditional cases

1 call uses a ternary:
```typescript
toast.error(mode === "append" ? "Failed to load more" : "Failed to load");
```

This becomes:
```typescript
handleApiError(
  mode === "append"
    ? t("redis.stream.loadMoreFailed")
    : t("redis.stream.loadFailed"),
  e,
);
```

## Verification

1. `cargo check` — no Rust changes, but good practice
2. `npm run typecheck` — verify TypeScript compiles with new keys
3. `npm run lint` — no lint errors
4. Manual test: switch language to Chinese, trigger Redis errors, verify Chinese strings appear
