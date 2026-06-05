# TabItem Discriminated Union Refactor

## Problem

`src/types/tab.ts:4` defines a single `TabItem` interface with 30+ optional fields. Every tab type shares the same shape, so the type system cannot guarantee which fields are present for a given tab kind. This forces:

- Runtime null guards in every renderer (`if (tab.connectionId === undefined) return null`)
- Unsafe non-null assertions (`tab.connectionId!`, `tab.database!`)
- No compile-time signal when a field is missing or misspelled

## Approach

Replace the single interface with a **discriminated union** of 12 subtypes — one per `type` literal. Each subtype declares only the fields it actually uses. `TabItem` becomes the union type.

Chosen over alternatives:
- **Shared base + extends**: Saves ~2-3 lines per subtype but adds inheritance indirection. Not worth it.
- **Grouped union**: Loses precision that the renderer dispatch map already provides.

## Type Definitions

All types live in `src/types/tab.ts`. Each subtype has a literal `type` field as the discriminator.

```
QueryResults {                              // Extracted shared shape
  data: any[]
  columns: string[]
  executionTime: string
  error?: string
  resultSets?: SingleResultState[]
  activeResultSetIndex?: number
}

EditorTabItem {
  type: "editor"
  id: string;  title: string
  connectionId?: number;  connection?: string;  database?: string;  driver?: string
  sqlContent?: string;  lastSavedSql?: string;  isDirty?: boolean
  queryResults?: QueryResults | null
  activeQueryId?: string;  lastQueryId?: string
  schemaOverview?: SchemaOverview
  savedQueryId?: number;  savedQueryDescription?: string
  availableDatabases?: string[]
}

TableTabItem {
  type: "table"
  id: string;  title: string
  connection?: string;  database?: string;  schema?: string;  tableName?: string
  connectionId?: number;  driver?: string
  data?: any[];  columns?: string[];  total?: number
  page?: number;  pageSize?: number;  executionTimeMs?: number
  isLoading?: boolean
  sortColumn?: string;  sortDirection?: "asc" | "desc"
  filter?: string;  orderBy?: string
}

DdlTabItem {
  type: "ddl"
  id: string;  title: string
  connectionId?: number;  database?: string;  schema?: string;  tableName?: string
}

RoutineTabItem {
  type: "routine"
  id: string;  title: string
  connection?: string;  database?: string;  schema?: string
  connectionId?: number;  driver?: string
  routineName?: string;  routineType?: RoutineType
}

CreateTableTabItem {
  type: "create-table"
  id: string;  title: string
  connectionId?: number;  database?: string;  schema?: string;  driver?: string
}

AlterTableTabItem {
  type: "alter-table"
  id: string;  title: string
  connectionId?: number;  database?: string;  schema?: string
  tableName?: string;  driver?: string
}

RedisKeyTabItem {
  type: "redis-key"
  id: string;  title: string
  connection?: string;  database?: string
  connectionId?: number;  driver?: string;  redisKey?: string
}

RedisConsoleTabItem {
  type: "redis-console"
  id: string;  title: string
  connection?: string;  database?: string
  connectionId?: number;  driver?: string
}

RedisBrowserTabItem {
  type: "redis-browser"
  id: string;  title: string
  connection?: string;  database?: string
  connectionId?: number;  driver?: string
}

RedisServerInfoTabItem {
  type: "redis-server-info"
  id: string;  title: string
  connection?: string;  database?: string
  connectionId?: number;  driver?: string
}

ElasticsearchIndexTabItem {
  type: "elasticsearch-index"
  id: string;  title: string
  connection?: string;  database?: string
  connectionId?: number;  driver?: string;  elasticsearchIndex?: string
}

ERDiagramTabItem {
  type: "er-diagram"
  id: string;  title: string
  connectionId?: number;  database?: string;  schema?: string
}

TabItem = EditorTabItem | TableTabItem | DdlTabItem | RoutineTabItem
        | CreateTableTabItem | AlterTableTabItem | RedisKeyTabItem
        | RedisConsoleTabItem | RedisBrowserTabItem | RedisServerInfoTabItem
        | ElasticsearchIndexTabItem | ERDiagramTabItem
```

All subtypes are exported individually. `TabItem` (the union) is also exported.

## Files Changed

### Must change

| File | Change |
|------|--------|
| `src/types/tab.ts` | Replace interface with 12 subtypes + union |
| `src/components/layout/TabContentRenderer.tsx` | Each renderer function signature takes its subtype instead of `TabItem` |
| `src/hooks/useTabFactory.ts` | Tab construction functions return specific subtypes |
| `src/hooks/useQueryEditor.ts` | Tab creation/updates use `EditorTabItem` |
| `src/hooks/useTableViewer.ts` | Tab creation/updates use `TableTabItem` |

### No change needed

These files use `TabItem` generically (the union type is a drop-in replacement):

- `src/App.tsx`
- `src/components/layout/TabBar.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/hooks/useTabManager.ts`
- `src/hooks/useUnsavedChanges.ts`
- `src/hooks/useKeyboardShortcuts.ts`
- `src/components/layout/UnsavedChangesDialog.tsx`

## Renderer Component Changes

Each renderer function in `TabContentRenderer.tsx` changes its `tab` parameter type:

```
// Before
function EditorTab({ tab, props }: { tab: TabItem; props: ... })

// After
function EditorTab({ tab, props }: { tab: EditorTabItem; props: ... })
```

The `TAB_RENDERERS` map stays as `Record<TabItem["type"], TabRenderer>`. Each renderer's internal type is narrowed via the `tab` prop type.

Null-guard checks (`if (tab.connectionId === undefined) return null`) stay as-is — they're runtime safety for edge cases.

## Tab Construction Changes

`useTabFactory.ts` functions return specific subtypes:

```
// Before
function openRedisConsole(...) {
  return { id, type: "redis-console", connection, database, connectionId, driver };
}

// After — return type is RedisConsoleTabItem
function openRedisConsole(...): RedisConsoleTabItem {
  return { id, type: "redis-console", connection, database, connectionId, driver };
}
```

Same pattern for `useQueryEditor.ts` (EditorTabItem) and `useTableViewer.ts` (TableTabItem).

## setTabs Compatibility

`setTabs` remains `React.Dispatch<React.SetStateAction<TabItem[]>>`. All updater functions that do `.map()` on the array continue to work because `TabItem` is the union — TypeScript can narrow via `tab.type` checks inside map callbacks if needed, but existing code that spreads `...t` on a matched tab still works.

## Verification

1. `npx tsc --noEmit` passes with no type errors
2. `npm run lint` passes
3. All existing tests pass (`npm run test`)
4. No behavioral changes — this is a pure type refactoring
