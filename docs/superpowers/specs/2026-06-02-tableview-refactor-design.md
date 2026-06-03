# TableView.tsx Refactoring Design

## Problem

`TableView.tsx` is a 2,930-line monolithic component with 35 `useState` hooks covering: pagination, column widths, cell selection, row selection, cell editing, draft rows, search, view mode switching, SQL generation, copy/paste, export, and more. This makes the component difficult to understand, maintain, and optimize for performance.

## Goal

Refactor `TableView.tsx` into focused custom hooks and small sub-components while preserving the existing external API (`TableViewProps`). No changes required from consuming components (`App.tsx`, `SqlEditor.tsx`, etc.).

## Approach

Extract 7 custom hooks + 7 sub-components. Each file stays under 300 lines. Apply `React.memo` to key sub-components for render optimization.

---

## File Structure

```
src/components/business/DataGrid/
├── TableView.tsx                  # Composition layer (~300 lines)
├── ComplexValueViewer.tsx         # Existing, unchanged
└── tableView/
    ├── utils.ts                   # Existing, unchanged
    ├── selectionCopy.ts           # Existing, unchanged
    ├── columnAutocomplete.ts      # Existing, unchanged
    ├── ColumnAutocompleteInput.tsx # Existing, unchanged
    │
    ├── hooks/
    │   ├── useCellSelection.ts    # Cell/row/range selection state
    │   ├── useCellEditing.ts      # Editing, draft rows, pending changes, PK metadata
    │   ├── useColumnState.ts      # Column widths, view mode, column comments
    │   ├── useTableSearch.ts      # Search keyword, matches, cursor navigation
    │   ├── useTablePagination.ts  # Page/pageSize/where/orderBy input state
    │   ├── useTableMutation.ts    # Save, delete, refresh, export operations
    │   └── useTableSort.ts        # Sort column/direction (controlled + uncontrolled)
    │
    ├── TableToolbar.tsx           # Toolbar: pagination, search, filter, action buttons
    ├── VirtualTableBody.tsx       # Virtualized table (header + virtual rows + draft rows)
    ├── ColumnViewBody.tsx         # Column-view rendering mode
    ├── TableRow.tsx               # Single row, React.memo with custom comparator
    ├── TableContextMenuContent.tsx # Context menu content
    ├── TableStatusBar.tsx         # Bottom status bar
    └── DraftRows.tsx              # Draft insert rows
```

---

## Custom Hooks

### `useCellSelection`

Manages: `selectedCell`, `selectedRows`, `rowSelectionAnchor`, `isRowSelecting`, `cellSelectionRange`, `isCellSelecting`. Includes stable refs for event handler access.

**Returns:**
- `state` — all selection state values + refs
- `handlers` — `handleCellClick`, `handleCellMouseDownForRange`, `handleCellMouseMoveForRange`, `handleCellMouseUpForRange`, `handleIndexMouseDown`, `handleIndexMouseEnter`, `selectSingleRow`, `clearSelection`
- `utils` — `isCellInRange`

### `useCellEditing`

Manages: `editingCell`, `editValue`, `pendingChanges`, `insertDraftRows`, `primaryKeys`, `tableColumns`, `columnComments`, `clickhouseEngine`, and mutation state (`isSaving`, `saveError`, `deleteDialogOpen`, `isDeleting`, `lastRefreshedAt`, `isRefreshing`). Fetches primary keys and column metadata via `api.metadata.getTableMetadata`.

**Derived values:** `canInsert`, `canUpdateDelete`, `hasPendingChanges`, `pendingMutationCount`, `mutabilityHint`, `isEditableForUpdates`.

**Returns:**
- `state` — all editing + metadata state
- `handlers` — `commitEdit`, `cancelEdit`, `handleEditKeyDown`, `handleCellDoubleClick`, `handleSave`, `handleConfirmDelete`, `handleDiscardChanges`, `handleAddDraftRow`, `handleDraftValueChange`, `handleRefreshClick`, `generateUpdateSQL`, `generateInsertSQL`, `buildDeleteSQL`

### `useColumnState`

Manages: `columnWidths`, `viewMode`, `columnComments` (passed from `useCellEditing`). Auto-calculates column widths from content. Handles column resize via mouse events.

**Returns:** `columnWidths`, `viewMode`, `setViewMode`, `getColWidth`, `handleMouseDown`, `tableWidthPx`

### `useTableSearch`

Manages: `isSearchOpen`, `searchKeyword`, `searchCursorIndex`. Computes `searchMatches`, `matchedRows`, `matchedCellKeys`, `currentSearchMatch` via `useMemo`.

**Returns:** all search state + `jumpToSearchMatch`, `handleSearchEnter`, `normalizedSearchKeyword`

### `useTablePagination`

Manages: `whereInput`, `orderByInput`, `pageInput`, `pageSizeInput`. Syncs with controlled props via `useEffect`.

**Returns:** all input states + `handlePageInputCommit`, `handlePageSizeChange`, `handlePrevPage`, `handleNextPage`

### `useTableSort`

Manages: `internalSortColumn`, `internalSortDirection` (for uncontrolled mode). Derives `activeSortColumn`, `activeSortDirection` from controlled props or internal state.

**Returns:** `activeSortColumn`, `activeSortDirection`, `handleSortClick`, `hasLocalClientSort`, `isControlledSort`

### `useTableMutation`

Manages: `isExporting`, `handleExport` (file dialog + `api.transfer.exportTable`).

**Returns:** `isExporting`, `handleExport`

---

## Sub-Components

### `TableToolbar` (~250 lines)

Contains all toolbar JSX: pagination controls, page size selector, refresh button, view mode toggle, search popover, DDL/ER/query buttons, insert/delete/save/discard buttons, export dropdown, WHERE/ORDER BY filter inputs, mutability hint.

Wrapped with `React.memo` (default comparator — props are stable callbacks from hooks).

### `VirtualTableBody` (~200 lines)

Renders the virtualized table view: `<table>` with `<colgroup>`, sticky `<thead>` (column headers with sort, resize, copy), virtualized `<tbody>` with spacer rows.

Delegates each visible row to `TableRow`.

### `TableRow` (~150 lines) — Critical Performance Component

Renders a single `<tr>` with all its `<td>` cells. Wrapped with `React.memo` using a **custom comparator**:

```ts
React.memo(TableRow, (prev, next) => {
  return (
    prev.row === next.row &&
    prev.editingCell?.row !== prev.rowIndex &&
    next.editingCell?.row !== next.rowIndex &&
    prev.selectedCell?.row !== prev.rowIndex &&
    next.selectedCell?.row !== next.rowIndex &&
    !prev.selectedRows.has(prev.rowIndex) &&
    !next.selectedRows.has(next.rowIndex) &&
    // ... only re-render when THIS row is involved
  );
});
```

**Performance impact:** With 100 rows × 20 columns = 2,000 cells, editing one cell currently re-renders all 2,000. With memo, only the 20 cells in the edited row re-render (~99% reduction).

### `ColumnViewBody` (~100 lines)

Renders the column-view mode (transposed table). Simpler structure, no virtualization needed (columns are typically fewer than rows).

### `TableContextMenuContent` (~150 lines)

Renders context menu items: filter submenu, copy cell/row/selection, copy as CSV/Insert SQL/Update SQL, undo cell. Receives `contextMenuRow` and all needed handlers as props.

### `DraftRows` (~50 lines)

Renders insert draft rows below the virtualized table. Each draft row has input fields for each column.

### `TableStatusBar` (~40 lines)

Renders bottom status bar: execution time, row count, search match count, refresh status, unsaved changes count.

---

## Composition Layer (TableView.tsx)

The refactored `TableView.tsx` becomes a ~300-line composition layer:

```tsx
export function TableView({ data, columns, ... }: TableViewProps) {
  const { t } = useTranslation();

  // Derived data
  const sortedData = useMemo(() => ...);
  const currentData = useMemo(() => ...);
  const totalPages = Math.ceil(...);
  const virtualizer = useVirtualizer({ ... });
  const startIndex = (page - 1) * pageSize;

  // Hooks
  const sort = useTableSort({ controlledSortColumn, controlledSortDirection, onSortChange });
  const pagination = useTablePagination({ page, pageSize, controlledFilter, controlledOrderBy });
  const columnState = useColumnState(columns);
  const selection = useCellSelection();
  const editing = useCellEditing({ data, currentData, columns, tableContext, onDataRefresh });
  const search = useTableSearch({ currentData, columns, getCellDisplayValue: editing.getCellDisplayValue });
  const mutation = useTableMutation({ tableContext, onDataRefresh });

  // Keyboard shortcuts (thin effect, delegates to hooks)
  useEffect(() => { ... }, []);

  // UI-only state (stays in composition layer, not in hooks)
  const [complexViewer, setComplexViewer] = useState<{ value: unknown; columnName: string } | null>(null);
  const [contextMenuRow, setContextMenuRow] = useState<number | null>(null);

  // Copy/paste handlers (thin, delegates to utils + hooks)
  const handleCopy = useCallback(...);
  const handleCopySelection = useCallback(...);
  const handlePaste = useCallback(...);

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-background" ...>
      {!hideHeader && (
        <TableToolbar
          {...pagination.state}
          {...sort.state}
          {...columnState}
          {...search.state}
          {...editing.state}
          {...mutation.state}
          onFilterChange={onFilterChange}
          onCreateQuery={onCreateQuery}
          onShowDDL={handleShowDDL}
          onOpenERDiagram={onOpenERDiagram}
          // ... other props
        />
      )}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        {columnState.viewMode === "table" ? (
          <VirtualTableBody
            columns={columns}
            currentData={currentData}
            virtualizer={virtualizer}
            startIndex={startIndex}
            {...columnState}
            {...selection.state}
            {...editing.state}
            {...search.state}
            {...sort.state}
            onCellClick={selection.handlers.handleCellClick}
            onCellDoubleClick={editing.handlers.handleCellDoubleClick}
            onSortClick={sort.handleSortClick}
            onCommitEdit={editing.handlers.commitEdit}
            onContextMenuRowChange={...}
          />
        ) : (
          <ColumnViewBody ... />
        )}
      </div>
      <TableStatusBar
        executionTimeMs={executionTimeMs}
        sortedDataLength={sortedData.length}
        searchKeyword={search.searchKeyword}
        matchedRowsSize={search.matchedRows.size}
        isRefreshing={editing.state.isRefreshing}
        lastRefreshedAt={editing.state.lastRefreshedAt}
        hasPendingChanges={editing.state.hasPendingChanges}
        pendingMutationCount={editing.state.pendingMutationCount}
      />
      {/* Dialogs */}
      <AlertDialog ... />
      {editing.state.saveError && <div>...</div>}
      {complexViewer && <ComplexValueViewer ... />}
    </div>
  );
}
```

---

## React.memo Strategy

| Component | Memo Strategy | Benefit |
|---|---|---|
| `TableRow` | Custom comparator: only re-renders when the row itself is involved in selection/editing/search | ~99% fewer cell re-renders during editing |
| `TableToolbar` | Default memo | Isolates toolbar from table body re-renders |
| `VirtualTableBody` | Default memo | Isolates table from toolbar/status bar re-renders |
| `TableContextMenuContent` | Default memo | Only renders when context menu is open |
| `TableStatusBar` | Default memo | Only re-renders on status changes |
| `DraftRows` | Default memo | Only re-renders when drafts change |
| `ColumnViewBody` | Default memo | Only re-renders in column view mode |

---

## Migration Strategy

### Step 1: Extract Hooks (no UI changes)
Extract hooks one at a time, starting from leaf dependencies:
1. `useTableSort` — no dependencies
2. `useTablePagination` — no dependencies
3. `useColumnState` — no dependencies
4. `useCellSelection` — no dependencies
5. `useCellEditing` — depends on `api.metadata`
6. `useTableMutation` — depends on `api.transfer`, `api.query`
7. `useTableSearch` — depends on `getCellDisplayValue`

Each hook extraction: replace the corresponding `useState` + `useCallback`/`useEffect` blocks in `TableView.tsx` with a single hook call. Tests must pass after each extraction.

### Step 2: Extract Leaf Sub-Components
1. `TableStatusBar` — pure display, no children
2. `DraftRows` — simple input rows
3. `TableContextMenuContent` — context menu items

### Step 3: Extract Core Sub-Components
1. `TableRow` with `React.memo` — extract from `VirtualTableBody`'s row rendering
2. `VirtualTableBody` — uses `TableRow`, owns virtual scroll logic
3. `ColumnViewBody` — separate rendering path

### Step 4: Extract TableToolbar
The largest sub-component. Extract once hooks are stable.

### Step 5: Refactor Main Component
Wire everything together in the composition layer.

### Step 6: Verify
- Existing unit tests (`utils.unit.test.ts`, `selectionCopy.unit.test.ts`, `columnAutocomplete.unit.test.ts`) must pass
- Manual testing: table editing, cell selection, row selection, copy/paste, search, sort, pagination, filter, export, draft rows, context menu, keyboard shortcuts

---

## Backward Compatibility

- `TableViewProps` interface: **unchanged**
- All consuming components (`App.tsx`, `SqlEditor.tsx`): **no changes needed**
- Existing utility files (`utils.ts`, `selectionCopy.ts`, `columnAutocomplete.ts`): **unchanged**
- Existing tests: **must continue to pass**

---

## Expected Outcome

| Metric | Before | After |
|---|---|---|
| `TableView.tsx` lines | 2,930 | ~300 |
| `useState` count in main component | 35 | 0 (moved to hooks) |
| Largest file in `tableView/` | 2,930 | ~250 (`TableToolbar`) |
| Files with > 300 lines | 1 | 0 |
| `React.memo` usage | 0 | 7 components |
| Cell re-renders on edit | 2,000 (100 rows × 20 cols) | ~20 (1 row × 20 cols) |
| External API changes | N/A | None |
