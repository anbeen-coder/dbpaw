# RedisKeyFormHeader SET Options Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate 10 SET-option props in RedisKeyFormHeader into a single `setOptions` object + `onSetOptionsChange` callback.

**Architecture:** Merge 5 individual `useState` in `useRedisKey` into one `SetOptions` object. Pass grouped object through `RedisKeyView` to `RedisKeyFormHeader`. Component internals reference `setOptions.nx` etc. instead of bare `setNx`.

**Tech Stack:** React, TypeScript

---

### Task 1: Define SetOptions type and update hook

**Files:**
- Modify: `src/components/business/Redis/useRedisKey.ts`

- [ ] **Step 1: Add SetOptions interface and merge state**

Replace lines 78-82:

```ts
const [setOptionsExpanded, setSetOptionsExpanded] = useState(false);
const [setNx, setSetNx] = useState(false);
const [setXx, setSetXx] = useState(false);
const [setPx, setSetPx] = useState("");
const [setKeepttl, setSetKeepttl] = useState(false);
```

With:

```ts
interface SetOptions {
  expanded: boolean;
  nx: boolean;
  xx: boolean;
  px: string;
  keepttl: boolean;
}

const [setOptions, setSetOptions] = useState<SetOptions>({
  expanded: false,
  nx: false,
  xx: false,
  px: "",
  keepttl: false,
});

const handleSetOptionsChange = (patch: Partial<SetOptions>) =>
  setSetOptions((prev) => ({ ...prev, ...patch }));
```

- [ ] **Step 2: Update handleSave to use setOptions**

In `handleSave` (around line 200), replace:

```ts
const pxValue = setPx.trim() ? parseInt(setPx, 10) : undefined;
// ...
setNx: setNx || undefined,
setXx: setXx || undefined,
setPx: pxValue && pxValue > 0 ? pxValue : undefined,
setKeepttl: setKeepttl || undefined,
```

With:

```ts
const pxValue = setOptions.px.trim() ? parseInt(setOptions.px, 10) : undefined;
// ...
setNx: setOptions.nx || undefined,
setXx: setOptions.xx || undefined,
setPx: pxValue && pxValue > 0 ? pxValue : undefined,
setKeepttl: setOptions.keepttl || undefined,
```

- [ ] **Step 3: Update return value**

Replace the 10 individual return entries:

```ts
setOptionsExpanded,
setSetOptionsExpanded,
setNx,
setSetNx,
setXx,
setSetXx,
setPx,
setSetPx,
setKeepttl,
setSetKeepttl,
```

With:

```ts
setOptions,
handleSetOptionsChange,
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: Errors in `RedisKeyView.tsx` (expected — it still references old properties)

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Redis/useRedisKey.ts
git commit -m "refactor: merge SET option state in useRedisKey into single object"
```

---

### Task 2: Update RedisKeyFormHeader props and internals

**Files:**
- Modify: `src/components/business/Redis/RedisKeyFormHeader.tsx`

- [ ] **Step 1: Define SetOptions interface at top of file**

Add after `type RedisKind` (line 25):

```ts
interface SetOptions {
  expanded: boolean;
  nx: boolean;
  xx: boolean;
  px: string;
  keepttl: boolean;
}
```

- [ ] **Step 2: Replace 10 props with 2 in interface**

Remove from `RedisKeyFormHeaderProps`:

```ts
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
```

Add:

```ts
setOptions: SetOptions;
onSetOptionsChange: (patch: Partial<SetOptions>) => void;
```

- [ ] **Step 3: Update destructuring**

Replace:

```ts
setOptionsExpanded,
onSetOptionsExpandedChange,
setNx,
onSetNxChange,
setXx,
onSetXxChange,
setPx,
onSetPxChange,
setKeepttl,
onSetKeepttlChange,
```

With:

```ts
setOptions,
onSetOptionsChange,
```

- [ ] **Step 4: Update all internal references**

In the Advanced SET options section, replace:

- `onSetOptionsExpandedChange(!setOptionsExpanded)` → `onSetOptionsChange({ expanded: !setOptions.expanded })`
- `setOptionsExpanded ? "▲" : "▼"` → `setOptions.expanded ? "▲" : "▼"`
- `{setOptionsExpanded && (` → `{setOptions.expanded && (`
- `checked={!setNx && !setXx}` → `checked={!setOptions.nx && !setOptions.xx}`
- `onSetNxChange(false); onSetXxChange(false);` → `onSetOptionsChange({ nx: false, xx: false })`
- `checked={setNx}` → `checked={setOptions.nx}`
- `onSetNxChange(true); onSetXxChange(false);` → `onSetOptionsChange({ nx: true, xx: false })`
- `checked={setXx}` → `checked={setOptions.xx}`
- `onSetNxChange(false); onSetXxChange(true);` → `onSetOptionsChange({ nx: false, xx: true })`
- `value={setPx}` → `value={setOptions.px}`
- `onSetPxChange(e.target.value)` → `onSetOptionsChange({ px: e.target.value })`
- `checked={setKeepttl}` → `checked={setOptions.keepttl}`
- `onSetKeepttlChange(e.target.checked)` → `onSetOptionsChange({ keepttl: e.target.checked })`

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: Errors in `RedisKeyView.tsx` (expected — next task fixes it)

- [ ] **Step 6: Commit**

```bash
git add src/components/business/Redis/RedisKeyFormHeader.tsx
git commit -m "refactor: consolidate SET option props in RedisKeyFormHeader"
```

---

### Task 3: Update RedisKeyView prop passing

**Files:**
- Modify: `src/components/business/Redis/RedisKeyView.tsx`

- [ ] **Step 1: Replace 10 props with 2**

Remove:

```tsx
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
```

Add:

```tsx
setOptions={hk.setOptions}
onSetOptionsChange={hk.handleSetOptionsChange}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Redis/RedisKeyView.tsx
git commit -m "refactor: update RedisKeyView to use consolidated SET options"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

Open the app, connect to Redis, create a new string key with NX + PX options. Verify the Advanced SET options panel expands/collapses, radio buttons work, PX input accepts values, KEEPTTL checkbox toggles. Save and confirm the key is created correctly.
