# Component Behavior Tests Design

**Date**: 2026-06-08
**Scope**: Add behavior-driven unit tests to 5 high-risk frontend modules

## Goal

Replace snapshot-style testing with behavior tests that verify user-facing interactions: click, type, select, submit, navigate. Each test exercises a specific behavior path through the component.

## Constraints

- Test framework: Bun test runner (`bun:test`) + happy-dom + `@testing-library/react`
- Mocking: `mock.module()` (Bun-specific) for heavy externals
- File convention: `*.unit.test.tsx` co-located next to source
- No production code changes — test existing behavior as-is
- Run via: `bun run test:unit` (finds all `*.unit.test.ts` files)

## Modules

| # | Module | File | Test File | Est. Cases |
|---|--------|------|-----------|------------|
| 1 | TabContentRenderer | `src/components/layout/TabContentRenderer.tsx` | `TabContentRenderer.unit.test.tsx` | 15-20 |
| 2 | useTabFactory | `src/hooks/useTabFactory.ts` | `useTabFactory.unit.test.tsx` | 18-22 |
| 3 | SqlEditor | `src/components/business/Editor/SqlEditor.tsx` | `SqlEditor.unit.test.tsx` | 20-25 |
| 4 | ConnectionDialog | `src/components/business/Sidebar/connection-list/ConnectionDialog.tsx` | `ConnectionDialog.unit.test.tsx` | 22-28 |
| 5 | TableView | `src/components/business/DataGrid/TableView.tsx` | `TableView.unit.test.tsx` | 25-30 |

**Total**: ~100-125 test cases across 5 files.

## Pattern

Follow `RedisBrowserView.unit.test.tsx` as the reference pattern:

```typescript
// 1. mock.module() at top — before any imports
mock.module("@/services/api", () => ({ api: { ... } }));
mock.module("./HeavyChild", () => ({
  HeavyChild: (props: any) => { calls.push(props); return <div />; },
}));

// 2. Import after mocks
import { render, screen, act } from "@testing-library/react";
import { ComponentUnderTest } from "./ComponentUnderTest";

// 3. Test structure
describe("ComponentUnderTest", () => {
  let calls: any[];
  beforeEach(() => { calls = []; });

  async function flush() {
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  }

  test("behavior description", async () => {
    const { container } = render(<ComponentUnderTest />);
    await flush();
    expect(container.textContent).toContain("expected");
  });
});
```

## Module 1: TabContentRenderer

**Test file**: `src/components/layout/TabContentRenderer.unit.test.tsx`

**Mocking strategy**:
- Mock all lazy children: `SqlEditor`, `CreateTableView`, `AlterTableView`, `RedisKeyView`, `RedisConsole`, `RedisBrowserView`, `RedisServerInfoView`, `ElasticsearchIndexView`, `ERDiagramView`
- Each mock captures props and renders a lightweight `<div data-testid="type-name" />`
- Mock `TabActionsProvider` to pass handler props through to children

**Test cases**:
1. `shouldMountTabContent` — same tab returns true, different tab returns false, empty strings
2. Empty tabs array — renders empty hint with FileCode icon
3. `renderTab("editor")` — renders EditorTab stub with correct props
4. `renderTab("table")` — renders TableTab stub with correct props
5. `renderTab("routine")` — renders RoutineTab stub with correct props
6. `renderTab("redis-key")` — renders RedisKeyTab, nulls when missing connectionId/database/redisKey
7. `renderTab("redis-console")` — nulls when missing connectionId/database
8. `renderTab("redis-browser")` — nulls when missing connection/connectionId/database/driver
9. `renderTab("redis-server-info")` — nulls when missing connectionId/database
10. `renderTab("elasticsearch-index")` — nulls when missing connectionId/index
11. `renderTab("er-diagram")` — nulls when missing connectionId
12. `renderTab("create-table")` — nulls when missing connectionId/database/driver
13. `renderTab("alter-table")` — nulls when missing connectionId/database/tableName/driver
14. `renderTab("ddl")` — renders MetadataFallbackTab
15. Multiple tabs — only active tab's content is mounted
16. Tab switch — new tab mounts, old tab unmounts

## Module 2: useTabFactory

**Test file**: `src/hooks/useTabFactory.unit.test.tsx`

**Mocking strategy**:
- `mock.module("@/services/api", ...)` — mock `api.transfer.exportTable`, `api.transfer.exportDatabase`
- `mock.module("sonner", ...)` — mock `toast.success`, `toast.error`
- `mock.module("react-i18next", ...)` — return `t` as identity function

**Test cases**:
1. `openOrCreateTab` — new tab appended, becomes active
2. `openOrCreateTab` — existing tab activated without duplication
3. `openRedisConsole` — generates `redis-console-{id}-{db}` tab ID
4. `openRedisBrowser` — generates `redis-browser-{id}-{db}` tab ID
5. `openRedisServerInfo` — generates `redis-server-info-{id}-{db}` tab ID
6. `openRedisKey` — generates `redis-{id}-{db}-{key}` tab ID
7. `openElasticsearchIndex` — generates `elasticsearch-{id}-{index}` tab ID
8. `openTableDDL` — generates `ddl-{id}-{db}-{schema}-{table}` tab ID
9. `openRoutine` — generates `routine-{id}-{db}-{schema}-{type}-{name}` tab ID
10. `openCreateTable` — generates unique ID with `Date.now()` per call
11. `openAlterTable` — generates `alter-table-{id}-{db}-{schema}-{table}` tab ID
12. `openERDiagram` — generates `er-diagram-{db}` tab ID
13. `openERDiagram` — returns early when connectionId missing
14. `openERDiagram` — returns early when database missing
15. `exportTable` — calls API, shows success toast
16. `exportTable` — API error shows error toast
17. `exportDatabase` — calls API, shows success toast
18. `exportDatabase` — API error shows error toast
19. Tab type field set correctly for each factory method
20. Tab title set correctly for each factory method

## Module 3: SqlEditor

**Test file**: `src/components/business/Editor/SqlEditor.unit.test.tsx`

**Mocking strategy**:
- `mock.module("@uiw/react-codemirror", ...)` — render `<textarea>` that calls `onChange` on input, calls `onCreateEditor` with a mock EditorView
- `mock.module("@tauri-apps/plugin-dialog", ...)` — mock `save` function
- `mock.module("./SaveQueryDialog", ...)` — prop-capturing stub
- `mock.module("@/components/ui/resizable", ...)` — plain div wrappers
- `mock.module("@/components/ui/tooltip", ...)` — render children directly
- `mock.module("@/components/ui/select", ...)` — render native `<select>`
- `mock.module("@/components/ui/dropdown-menu", ...)` — render children directly
- `mock.module("@/contexts/ShortcutsContext", ...)` — return dummy bindings
- `mock.module("react-i18next", ...)` — identity `t`
- `mock.module("sonner", ...)` — mock toast

**Test cases**:
1. Renders editor with initial SQL value
2. Play button calls `onExecute` with current SQL
3. Play button disabled when `isExecuting=true`
4. Cancel button calls `onCancel`
5. `onChange` debounces at 300ms before calling parent
6. Database selector renders when `availableDatabases.length > 1`
7. Database selector calls `onDatabaseChange` on change
8. Database label (no selector) when single database
9. Save button opens SaveQueryDialog for new query (no `savedQueryId`)
10. Save button directly calls API for existing `savedQueryId`
11. SaveQueryDialog `onSave` calls `api.queries.create`
12. SaveQueryDialog `onSave` with existing ID calls `api.queries.update`
13. Format button calls `sql-formatter` with correct dialect for postgres
14. Format button uses mysql dialect for tidb/mariadb/starrocks
15. Results panel renders when `queryResults` provided
16. Error state renders error message for `queryResults.error`
17. Multiple result sets render tabs, switching updates displayed data
18. Clear button sets editor content to empty string
19. Export dropdown shows CSV/JSON/SQL options
20. Export calls `api.transfer.exportQueryResult` with correct params
21. Export shows error toast when no connectionId
22. Result status shows success with row count
23. Result status shows error tone for failed queries

## Module 4: ConnectionDialog

**Test file**: `src/components/business/Sidebar/connection-list/ConnectionDialog.unit.test.tsx`

**Mocking strategy**:
- `mock.module("@/lib/driver-registry", ...)` — minimal DRIVER_REGISTRY with postgres, sqlite, redis, elasticsearch
- `mock.module("@/lib/connection-form/rules", ...)` — mock capabilities per driver
- `mock.module("./ElasticsearchFormSection", ...)` — prop-capturing stub
- `mock.module("./MongoDbFormSection", ...)` — prop-capturing stub
- `mock.module("./MssqlFormSection", ...)` — prop-capturing stub
- `mock.module("./RedisFormSection", ...)` — prop-capturing stub
- `mock.module("react-i18next", ...)` — identity `t`

**Test cases**:
1. Create mode — type step renders driver grid
2. Create mode — clicking driver calls `onCreateDriverSelect`
3. Create mode — details step shows form fields
4. Create mode — "Back to type" button calls `onBackToType`
5. Edit mode — skips type step, shows details directly
6. Edit mode — "Back to type" button hidden
7. Connection name field renders and updates form
8. Host/port fields render for network drivers (postgres)
9. Host/port fields hidden for file-based drivers (sqlite)
10. File path field renders for sqlite with browse button
11. File path field renders for duckdb with correct placeholder
12. Username/password fields render when capabilities allow
13. Username required indicator shown when `requiresUsername` true
14. Password required indicator shown for create mode when `requiresPasswordOnCreate`
15. SSL checkbox toggles SSL section visibility
16. SSL mode selector shows when SSL enabled
17. SSL CA cert textarea shows when mode is `verify_ca`
18. SSH checkbox toggles SSH section visibility
19. SSH fields render when SSH enabled
20. Redis shows `RedisFormSection` for redis driver
21. Elasticsearch shows `ElasticsearchFormSection` for elasticsearch driver
22. MongoDB shows `MongoDbFormSection` for mongodb driver
23. Validation alert shows when `validationMsg` non-null
24. Test connection button calls `onTestConnection`
25. Test connection button shows spinner when `isTesting`
26. Submit button disabled when `!requiredOk`
27. Submit button shows "Connecting..." when `isConnecting`
28. Submit button shows "Saving..." when `isSavingEdit`
29. Test result alert shows success/failure based on `testMsg.ok`
30. Close button calls `onClose`

## Module 5: TableView

**Test file**: `src/components/business/DataGrid/TableView.unit.test.tsx`

**Mocking strategy**:
- `mock.module("@tanstack/react-virtual", ...)` — `useVirtualizer` returns stub that renders all items
- Mock `VirtualTableBody` and `ColumnViewBody` as prop-capturing stubs
- Mock `TableToolbar` and `TableStatusBar` as prop-capturing stubs
- Keep most hooks real (useTableSort, useTablePagination, useCellSelection, etc.)
- `mock.module("./tableView/hooks/useTableMutation", ...)` — mock API calls
- `mock.module("react-i18next", ...)` — identity `t`

**Test cases**:
1. Loading state renders skeletons when `isLoading=true`
2. Empty state renders table with no rows when `data=[]`
3. Data renders rows with correct cell values
4. Sort — clicking column header triggers `onSortChange`
5. Sort — uncontrolled mode sorts client-side ascending
6. Sort — uncontrolled mode sorts client-side descending
7. Pagination — next page calls `onPageChange`
8. Pagination — prev page calls `onPageChange`
9. Pagination — page size change calls `onPageSizeChange`
10. Pagination — page input commit calls `onPageChange`
11. Cell click selects cell
12. Cell double-click enters edit mode
13. Edit — Enter commits edit
14. Edit — Escape cancels edit
15. Copy — selected cell copies value as TSV
16. Copy — row selection copies as TSV
17. Copy — selection copies as CSV/Insert SQL/Update SQL
18. Filter — `applyFilter` calls `onFilterChange` with expression
19. Row selection — click index column selects row
20. Row selection — Shift+click selects range
21. Context menu — right-click sets `contextMenuRow`
22. Search — open search, type keyword
23. Search — Enter cycles through matches
24. Draft row — "Add row" creates draft
25. Draft row — draft values editable
26. Delete — select rows, confirm dialog, delete
27. View mode toggle — switch between table and column view
28. Header copy — copies column name
29. Refresh button calls `onDataRefresh`
30. DDL button calls `onOpenDDL` with `tableContext`

## Implementation Order

1. **useTabFactory** — pure hook, simplest to test, establishes mock patterns
2. **TabContentRenderer** — component with many tab types, validates mock-per-child approach
3. **ConnectionDialog** — form-heavy, validates driver-specific rendering
4. **SqlEditor** — complex with CodeMirror mock, validates external lib mocking
5. **TableView** — most complex with many hooks, benefits from patterns built in 1-4

## Notes

- The existing `src/components/layout/TabContentRenderer.unit.test.ts` (9-line `.ts` file) will be **replaced** by the new `TabContentRenderer.unit.test.tsx`. The `shouldMountTabContent` tests will be preserved and expanded in the new file.

## Verification

After each file is written:
```bash
bun test src/path/to/file.unit.test.tsx
```

After all files:
```bash
bun run test:unit
```

## Out of Scope

- Snapshot tests (explicitly not wanted)
- Integration tests (require Docker/database)
- Refactoring production code to make it more testable
- Testing third-party library behavior (CodeMirror, virtualizer)
