# ConnectionDialog Refactor Design

## Problem

`ConnectionDialog.tsx` is 1234 lines with two issues:

1. **30+ identical `setForm` patterns** — every field repeats the same `setForm(current => ({...current, field: e.target.value}))` boilerplate
2. **Driver-specific UIs inline** — Redis (~100 lines), Elasticsearch (~140 lines), MSSQL (~100 lines), MongoDB (~20 lines) are all embedded in one component

## Solution

### `useFormField` helper

Create `src/lib/connection-form/use-form-field.ts`:

```ts
function useFormField<T extends keyof ConnectionForm>(
  form: ConnectionForm,
  setForm: Dispatch<SetStateAction<ConnectionForm>>,
  field: T,
  transformer?: (raw: string) => ConnectionForm[T],
): [ConnectionForm[T], (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void]
```

Usage:
```tsx
const [name, onNameChange] = useFormField(form, setForm, "name");
const [host, onHostChange] = useFormField(form, setForm, "host");
const [port, onPortChange] = useFormField(form, setForm, "port", Number);
// Then: <Input value={name} onChange={onNameChange} />
```

For checkboxes (`onCheckedChange`) and custom selects (Redis mode), use `useFormField` for value but write handlers inline — ~5 cases vs 30+ that can use it.

### Driver-specific form sections

Extract into separate files under `src/components/business/Sidebar/connection-list/`:

| Component | File | What it renders |
|---|---|---|
| `RedisFormSection` | `RedisFormSection.tsx` | Mode select, host/port (standalone), seed nodes (cluster), sentinels + service name + password (sentinel), timeout |
| `ElasticsearchFormSection` | `ElasticsearchFormSection.tsx` | Cloud ID, auth mode (none/basic/api_key), username/password, API key fields |
| `MongoDbFormSection` | `MongoDbFormSection.tsx` | Auth source input |
| `MssqlFormSection` | `MssqlFormSection.tsx` | Auth mode (sql_server/windows/integrated/aad_token), username/password, AAD token |

All share the same props interface:

```ts
interface DriverFormSectionProps {
  form: ConnectionForm;
  setForm: Dispatch<SetStateAction<ConnectionForm>>;
  dialogMode: "create" | "edit";
}
```

### ConnectionDialog after refactor

Drops from ~1234 to ~400-450 lines. Keeps:

- Dialog wrapper + header
- Driver type selector (create step)
- Driver banner with icon
- Connection name field
- Generic fields via `formCapabilities` (host/port, username/password, database/schema, SSL, SSH, file path)
- Action buttons
- Validation/test message alerts

Driver-specific sections become conditional renders:

```tsx
{isRedis && <RedisFormSection form={form} setForm={setForm} dialogMode={dialogMode} />}
{isElasticsearch && <ElasticsearchFormSection ... />}
{form.driver === "mongodb" && <MongoDbFormSection ... />}
{isMssql && <MssqlFormSection ... />}
```

### File structure

```
src/lib/connection-form/
  use-form-field.ts              (new)
  rules.ts                       (unchanged)

src/components/business/Sidebar/connection-list/
  ConnectionDialog.tsx           (refactored: ~400 lines)
  RedisFormSection.tsx           (new: ~120 lines)
  ElasticsearchFormSection.tsx   (new: ~150 lines)
  MongoDbFormSection.tsx         (new: ~20 lines)
  MssqlFormSection.tsx           (new: ~100 lines)
  ConnectionDialogs.tsx          (unchanged)
  ...other existing files        (unchanged)
```

### What stays in ConnectionDialog

Generic sections (host/port, username/password, database/schema, SSL, SSH, file path) stay because they're shared across most drivers and controlled by `formCapabilities`. These are ~200 lines, already organized by `showHost`/`showPort`/etc. flags.

The `useFormField` helper is used throughout both the main file and driver components for their respective fields.

### Risk

Low — pure extraction refactor. No behavior changes. Each driver component is independently testable. The `form`/`setForm` interface is preserved, so callers of `ConnectionDialog` don't need changes.

### Testing

- TypeScript compilation passes (no new types introduced)
- Existing behavior preserved: open dialog, select driver, fill fields, test connection, save
- Each driver-specific section works in isolation (create + edit modes)
