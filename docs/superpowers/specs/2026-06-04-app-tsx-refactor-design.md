# App.tsx Refactor Design

## Goal

Reduce App.tsx from 837 lines to ~180 lines by extracting responsibilities into focused hooks. Also fix the `treeCallbacks` stale closure bug.

## Current State

App.tsx contains:
- Type definitions (lines 42-53)
- Helper function `getTableTargetFromTab` (lines 60-77)
- 8 tab-opening handlers with duplicate pattern (lines 208-449, ~240 lines)
- 2 export handlers (lines 451-512, ~60 lines)
- `treeCallbacks` memoization with stale `[]` deps (lines 543-597)
- Settings state + loading effect (lines 109-112, 607-616)
- Tauri event listeners (lines 618-634)
- Fullscreen tracking (lines 636-666)
- Sidebar reveal / tab linkage logic (lines 146-196)
- JSX render (lines 709-834)

## New Hooks

### 1. `useTabFactory` (src/hooks/useTabFactory.ts)

**Extracts:** All 8 tab-opening handlers + 2 export handlers (~300 lines)

**Interface:**
```ts
function useTabFactory(params: {
  tabs: TabItem[];
  setTabs: Dispatch<SetStateAction<TabItem[]>>;
  setActiveTab: Dispatch<SetStateAction<string>>;
  t: TFunction;
}): {
  openRedisConsole: (connection: string, database: string, connectionId: number, driver: string) => void;
  openRedisBrowser: (connection: string, database: string, connectionId: number, driver: string) => void;
  openRedisServerInfo: (connection: string, database: string, connectionId: number, driver: string) => void;
  openRedisKey: (connection: string, database: string, redisKey: string, connectionId: number, driver: string) => void;
  openElasticsearchIndex: (connection: string, index: string, connectionId: number, driver: string) => void;
  openTableDDL: (ctx: { connectionId: number; database: string; schema: string; table: string }) => void;
  openRoutine: (connection: string, database: string, schema: string, name: string, routineType: RoutineType, connectionId: number, driver: string) => void;
  openCreateTable: (connectionId: number, database: string, schema: string, driver: string) => void;
  openAlterTable: (connectionId: number, database: string, schema: string, table: string, driver: string) => void;
  openERDiagram: (ctx?: { connectionId?: number; database?: string }) => void;
  exportTable: (ctx: ExportTableCtx, format: string, filePath: string) => Promise<void>;
  exportDatabase: (ctx: ExportDatabaseCtx, format: string, filePath: string) => Promise<void>;
}
```

**Implementation:** Each handler uses an internal helper `openOrCreateTab(tabId, type, title, extraFields)` that encapsulates the repeated find-existing → create-new → setActiveTab pattern.

### 2. `useTreeCallbacks` (src/hooks/useTreeCallbacks.ts)

**Extracts:** `treeCallbacks` memo and its dependency wiring (~55 lines)

**Interface:**
```ts
function useTreeCallbacks(params: {
  openRedisKey: (...) => void;
  openRedisBrowser: (...) => void;
  openRedisConsole: (...) => void;
  openRedisServerInfo: (...) => void;
  openElasticsearchIndex: (...) => void;
}): TreeCallbacks;
```

**Fixes:** Uses `useRef` to hold latest handler references, so `useMemo` can have `[]` deps while callbacks stay current. This fixes the stale closure bug.

### 3. `useAppSettings` (src/hooks/useAppSettings.ts)

**Extracts:** Settings state declarations + loading useEffect (~30 lines)

**Interface:**
```ts
function useAppSettings(): {
  sidebarLayout: SidebarLayoutMode;
  setSidebarLayout: Dispatch<SetStateAction<SidebarLayoutMode>>;
  showColumnComments: boolean;
  setShowColumnComments: Dispatch<SetStateAction<boolean>>;
  showRowNumbers: boolean;
  setShowRowNumbers: Dispatch<SetStateAction<boolean>>;
  showZebraStripes: boolean;
  setShowZebraStripes: Dispatch<SetStateAction<boolean>>;
};
```

### 4. `useWindowFullscreen` (src/hooks/useWindowFullscreen.ts)

**Extracts:** `isFullscreen` state + Tauri resize listener (~25 lines)

**Interface:**
```ts
function useWindowFullscreen(): boolean;
```

## App.tsx After Refactor

```tsx
export default function App() {
  const { t } = useTranslation();
  const { tabs, setTabs, activeTab, setActiveTab, handleDragEnd, handleCycleTabs: baseHandleCycleTabs, closeTabNow: baseCloseTabNow } = useTabManager();
  const { handleCreateQuery, handleOpenSavedQuery, handleSqlChange, handleExecuteQuery, handleEditorDatabaseChange, saveEditorTab } = useQueryEditor({ tabs, setTabs, setActiveTab, setQueriesLastUpdated, t });
  const { handleTableSelect, handleTableRefresh, handlePageChange, handlePageSizeChange, handleSortChange, handleFilterChange } = useTableViewer({ tabs, setTabs, setActiveTab, resolveTableScope, t });
  const { handleCloseTab, handleCloseOtherTabs, ... } = useUnsavedChanges({ tabs, closeTabNow: baseCloseTabNow, saveEditorTab });
  const settings = useAppSettings();
  const isFullscreen = useWindowFullscreen();
  const { openRedisConsole, openRedisBrowser, ... exportTable, exportDatabase } = useTabFactory({ tabs, setTabs, setActiveTab, t });
  const treeCallbacks = useTreeCallbacks({ openRedisKey, openRedisBrowser, openRedisConsole, openRedisServerInfo, openElasticsearchIndex });

  // ~20 lines: sidebar reveal, tab linkage, keyboard shortcuts, Tauri events
  // ~100 lines: JSX render
}
```

## Files Changed

| File | Action |
|------|--------|
| `src/hooks/useTabFactory.ts` | **New** |
| `src/hooks/useTreeCallbacks.ts` | **New** |
| `src/hooks/useAppSettings.ts` | **New** |
| `src/hooks/useWindowFullscreen.ts` | **New** |
| `src/App.tsx` | **Modified** — replace extracted logic with hook calls |
| `src/lib/tree-adapters/types.tsx` | No change (TreeCallbacks type already exists) |

## Out of Scope

- Refactoring `useQueryEditor` / `useTableViewer` / `useUnsavedChanges` (already well-structured)
- Changing `TabContentRenderer` props interface
- Moving `resolveTableScope` (stays in App.tsx, used by useTableViewer)
