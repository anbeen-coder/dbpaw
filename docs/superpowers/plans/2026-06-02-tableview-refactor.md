# TableView.tsx Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the 3,085-line `TableView.tsx` (35 `useState`) into 7 focused custom hooks + 6 sub-components, keeping each file under 300 lines and preserving the external API.

**Architecture:** Extract state groups into custom hooks (`useTableSort`, `useTablePagination`, `useColumnState`, `useCellSelection`, `useCellEditing`, `useTableMutation`, `useTableSearch`), then extract sub-components (`TableStatusBar`, `DraftRows`, `TableContextMenuContent`, `VirtualTableBody`, `ColumnViewBody`, `TableToolbar`). `DataRow` with `React.memo` is already done.

**Tech Stack:** React 19, TypeScript 5.8, @tanstack/react-virtual, shadcn/ui (Radix), lucide-react, sonner

**Spec:** `docs/superpowers/specs/2026-06-02-tableview-refactor-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/components/business/DataGrid/tableView/hooks/useTableSort.ts` | Sort column/direction (controlled + uncontrolled) |
| Create | `src/components/business/DataGrid/tableView/hooks/useTablePagination.ts` | Page/pageSize/where/orderBy input state |
| Create | `src/components/business/DataGrid/tableView/hooks/useColumnState.ts` | Column widths, view mode |
| Create | `src/components/business/DataGrid/tableView/hooks/useCellSelection.ts` | Cell/row/range selection |
| Create | `src/components/business/DataGrid/tableView/hooks/useCellEditing.ts` | Editing, draft rows, pending changes, PK metadata, save/delete/refresh |
| Create | `src/components/business/DataGrid/tableView/hooks/useTableMutation.ts` | Export state + handler |
| Create | `src/components/business/DataGrid/tableView/hooks/useTableSearch.ts` | Search keyword, matches, cursor |
| Create | `src/components/business/DataGrid/tableView/TableStatusBar.tsx` | Bottom status bar |
| Create | `src/components/business/DataGrid/tableView/DraftRows.tsx` | Draft insert rows |
| Create | `src/components/business/DataGrid/tableView/TableContextMenuContent.tsx` | Context menu content |
| Create | `src/components/business/DataGrid/tableView/VirtualTableBody.tsx` | Virtualized table (header + rows) |
| Create | `src/components/business/DataGrid/tableView/ColumnViewBody.tsx` | Column-view rendering |
| Create | `src/components/business/DataGrid/tableView/TableToolbar.tsx` | Toolbar with all controls |
| Modify | `src/components/business/DataGrid/TableView.tsx` | Composition layer (~300 lines) |

---

### Task 1: Extract `useTableSort` hook

**Files:**
- Create: `src/components/business/DataGrid/tableView/hooks/useTableSort.ts`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 624-652)

- [ ] **Step 1: Create the hook file**

```ts
// src/components/business/DataGrid/tableView/hooks/useTableSort.ts
import { useState, useCallback } from "react";

interface UseTableSortParams {
  controlledSortColumn?: string;
  controlledSortDirection?: "asc" | "desc";
  onSortChange?: (column: string, direction: "asc" | "desc") => void;
}

export function useTableSort({
  controlledSortColumn,
  controlledSortDirection,
  onSortChange,
}: UseTableSortParams) {
  const [internalSortColumn, setInternalSortColumn] = useState<
    string | undefined
  >();
  const [internalSortDirection, setInternalSortDirection] = useState<
    "asc" | "desc" | undefined
  >();

  const isControlledSort = !!onSortChange;
  const activeSortColumn = isControlledSort
    ? controlledSortColumn
    : internalSortColumn;
  const activeSortDirection = isControlledSort
    ? controlledSortDirection
    : internalSortDirection;
  const hasLocalClientSort =
    !isControlledSort && !!activeSortColumn && !!activeSortDirection;

  const handleSortClick = useCallback(
    (column: string) => {
      if (isControlledSort) {
        if (activeSortColumn === column) {
          onSortChange(
            column,
            activeSortDirection === "asc" ? "desc" : "asc",
          );
        } else {
          onSortChange(column, "asc");
        }
      } else {
        if (internalSortColumn === column) {
          setInternalSortDirection((prev) =>
            prev === "asc" ? "desc" : "asc",
          );
        } else {
          setInternalSortColumn(column);
          setInternalSortDirection("asc");
        }
      }
    },
    [
      isControlledSort,
      activeSortColumn,
      activeSortDirection,
      onSortChange,
      internalSortColumn,
    ],
  );

  return {
    activeSortColumn,
    activeSortDirection,
    handleSortClick,
    hasLocalClientSort,
    isControlledSort,
  };
}
```

- [ ] **Step 2: Replace the sort state block in TableView.tsx**

Replace lines 624-652 (the `internalSortColumn`, `internalSortDirection`, `isControlledSort`, `activeSortColumn`, `activeSortDirection`, `hasLocalClientSort`, `handleSortClick` declarations) with:

```ts
const {
  activeSortColumn,
  activeSortDirection,
  handleSortClick,
  hasLocalClientSort,
  isControlledSort,
} = useTableSort({
  controlledSortColumn,
  controlledSortDirection,
  onSortChange,
});
```

Remove the `internalSortColumn` and `internalSortDirection` useState declarations (lines 624-632).

- [ ] **Step 3: Verify build**

Run: `npm run build` (or `npx tsc --noEmit`)
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/hooks/useTableSort.ts src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract useTableSort hook from TableView"
```

---

### Task 2: Extract `useTablePagination` hook

**Files:**
- Create: `src/components/business/DataGrid/tableView/hooks/useTablePagination.ts`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 472-475, 509-528, 1489-1519)

- [ ] **Step 1: Create the hook file**

```ts
// src/components/business/DataGrid/tableView/hooks/useTablePagination.ts
import { useState, useEffect, useCallback } from "react";

const PAGE_SIZE_OPTIONS = ["10", "50", "100", "200", "500", "1000"] as const;

interface UseTablePaginationParams {
  page: number;
  pageSize: number;
  controlledFilter?: string;
  controlledOrderBy?: string;
  totalPages: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function useTablePagination({
  page,
  pageSize,
  controlledFilter,
  controlledOrderBy,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: UseTablePaginationParams) {
  const [whereInput, setWhereInput] = useState(controlledFilter || "");
  const [orderByInput, setOrderByInput] = useState(controlledOrderBy || "");
  const [pageInput, setPageInput] = useState(String(page));
  const [pageSizeInput, setPageSizeInput] = useState(String(pageSize));

  useEffect(() => {
    setWhereInput(controlledFilter || "");
  }, [controlledFilter]);

  useEffect(() => {
    setOrderByInput(controlledOrderBy || "");
  }, [controlledOrderBy]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    const next = String(pageSize);
    setPageSizeInput(
      PAGE_SIZE_OPTIONS.includes(next as (typeof PAGE_SIZE_OPTIONS)[number])
        ? next
        : "100",
    );
  }, [pageSize]);

  const handlePrevPage = useCallback(() => {
    if (page > 1) {
      onPageChange?.(page - 1);
    }
  }, [page, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (page < totalPages) {
      onPageChange?.(page + 1);
    }
  }, [page, totalPages, onPageChange]);

  const handlePageInputCommit = useCallback(() => {
    const parsed = Number.parseInt(pageInput, 10);
    const maxPage = Math.max(totalPages, 1);
    const nextPage = Number.isNaN(parsed)
      ? page
      : Math.min(Math.max(parsed, 1), maxPage);
    setPageInput(String(nextPage));
    if (nextPage !== page) {
      onPageChange?.(nextPage);
    }
  }, [pageInput, totalPages, page, onPageChange]);

  const handlePageSizeChange = useCallback(
    (value: string) => {
      setPageSizeInput(value);
      const nextPageSize = Number.parseInt(value, 10);
      if (!Number.isNaN(nextPageSize) && nextPageSize !== pageSize) {
        onPageSizeChange?.(nextPageSize);
      }
    },
    [pageSize, onPageSizeChange],
  );

  return {
    whereInput,
    setWhereInput,
    orderByInput,
    setOrderByInput,
    pageInput,
    setPageInput,
    pageSizeInput,
    handlePageInputCommit,
    handlePageSizeChange,
    handlePrevPage,
    handleNextPage,
  };
}
```

- [ ] **Step 2: Replace state blocks in TableView.tsx**

Remove lines 472-475 (whereInput, orderByInput, pageInput, pageSizeInput useState), lines 509-528 (useEffect for syncing), and lines 1489-1519 (handlePrevPage, handleNextPage, handlePageInputCommit, handlePageSizeChange functions).

Replace with:

```ts
const {
  whereInput,
  setWhereInput,
  orderByInput,
  setOrderByInput,
  pageInput,
  setPageInput,
  pageSizeInput,
  handlePageInputCommit,
  handlePageSizeChange,
  handlePrevPage,
  handleNextPage,
} = useTablePagination({
  page,
  pageSize,
  controlledFilter,
  controlledOrderBy,
  totalPages,
  onPageChange,
  onPageSizeChange,
});
```

Note: `totalPages` must be computed before this hook call. Move the `totalPages` calculation above the hook call:

```ts
const totalPages = Math.ceil((total || sortedData.length) / pageSize);
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/hooks/useTablePagination.ts src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract useTablePagination hook from TableView"
```

---

### Task 3: Extract `useColumnState` hook

**Files:**
- Create: `src/components/business/DataGrid/tableView/hooks/useColumnState.ts`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 476-507, 1204-1217, 1521-1569)

- [ ] **Step 1: Create the hook file**

```ts
// src/components/business/DataGrid/tableView/hooks/useColumnState.ts
import { useState, useRef, useEffect, useCallback } from "react";
import { calculateAutoColumnWidths } from "../utils";

const DEFAULT_COL_WIDTH = 150;
const INDEX_COL_WIDTH = 48;

interface UseColumnStateParams {
  data: any[];
  columns: string[];
}

export function useColumnState({ data, columns }: UseColumnStateParams) {
  const [viewMode, setViewMode] = useState<"table" | "column">("table");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const columnWidthsRef = useRef<Record<string, number>>({});
  columnWidthsRef.current = columnWidths;
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const resizingRef = useRef<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Reset column widths when columns definition changes
  const prevColumnsRef = useRef<string>("");
  useEffect(() => {
    const colsKey = columns.join(",");
    if (prevColumnsRef.current !== colsKey) {
      setColumnWidths({});
      prevColumnsRef.current = colsKey;
    }
  }, [columns]);

  // Auto-calculate column widths based on content
  useEffect(() => {
    const newWidths = calculateAutoColumnWidths({
      data,
      columns,
      columnWidths: columnWidthsRef.current,
    });
    const hasChanges = Object.keys(newWidths).length > 0;
    if (hasChanges) {
      setColumnWidths((prev) => ({ ...prev, ...newWidths }));
    }
  }, [data, columns]);

  const getColWidth = useCallback(
    (column: string) => columnWidths[column] ?? DEFAULT_COL_WIDTH,
    [columnWidths],
  );

  const tableWidthPx =
    INDEX_COL_WIDTH + columns.reduce((sum, c) => sum + getColWidth(c), 0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { column, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff);
    setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "default";
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, column: string) => {
      e.preventDefault();
      e.stopPropagation();
      const currentTh = thRefs.current[column];
      const startWidth = currentTh
        ? currentTh.getBoundingClientRect().width
        : getColWidth(column);
      resizingRef.current = { column, startX: e.clientX, startWidth };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
    },
    [getColWidth, handleMouseMove, handleMouseUp],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    viewMode,
    setViewMode,
    columnWidths,
    getColWidth,
    tableWidthPx,
    thRefs,
    handleMouseDown,
    INDEX_COL_WIDTH,
  };
}
```

- [ ] **Step 2: Replace state blocks in TableView.tsx**

Remove lines 476-507 (viewMode, columnWidths, columnWidthsRef, prevColumnsRef, and related useEffects), lines 1204-1217 (resizingRef, DEFAULT_COL_WIDTH, INDEX_COL_WIDTH, getColWidth, tableWidthPx), and lines 1521-1569 (handleMouseMove, handleMouseUp, handleMouseDown, cleanup useEffects).

Replace with:

```ts
const {
  viewMode,
  setViewMode,
  columnWidths,
  getColWidth,
  tableWidthPx,
  thRefs,
  handleMouseDown,
  INDEX_COL_WIDTH,
} = useColumnState({ data, columns });
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/hooks/useColumnState.ts src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract useColumnState hook from TableView"
```

---

### Task 4: Extract `useCellSelection` hook

**Files:**
- Create: `src/components/business/DataGrid/tableView/hooks/useCellSelection.ts`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 531-545, 608-682, 794-830)

- [ ] **Step 1: Create the hook file**

```ts
// src/components/business/DataGrid/tableView/hooks/useCellSelection.ts
import { useState, useRef, useCallback } from "react";

interface CellSelectionRange {
  anchor: { row: number; colIndex: number };
  tip: { row: number; colIndex: number };
}

export function useCellSelection() {
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [rowSelectionAnchor, setRowSelectionAnchor] = useState<number | null>(
    null,
  );
  const [isRowSelecting, setIsRowSelecting] = useState(false);
  const [cellSelectionRange, setCellSelectionRange] =
    useState<CellSelectionRange | null>(null);
  const [, setIsCellSelecting] = useState(false);

  const selectedCellRef = useRef(selectedCell);
  const selectedRowsRef = useRef(selectedRows);
  const cellSelectionRangeRef = useRef(cellSelectionRange);
  const isCellSelectingRef = useRef(false);

  // Keep refs in sync
  const updateSelectedCell = useCallback(
    (cell: { row: number; col: string } | null) => {
      selectedCellRef.current = cell;
      setSelectedCell(cell);
    },
    [],
  );

  const updateSelectedRows = useCallback((rows: Set<number>) => {
    selectedRowsRef.current = rows;
    setSelectedRows(rows);
  }, []);

  const handleCellClick = useCallback(
    (rowIndex: number, col: string) => {
      // If clicking a different cell while editing, caller should commit first
      const nextSelectedRows = new Set<number>();
      selectedRowsRef.current = nextSelectedRows;
      setSelectedRows(nextSelectedRows);
      setRowSelectionAnchor(null);
      setIsRowSelecting(false);
      setCellSelectionRange(null);
      setIsCellSelecting(false);
      isCellSelectingRef.current = false;
      const nextSelectedCell = { row: rowIndex, col };
      selectedCellRef.current = nextSelectedCell;
      setSelectedCell(nextSelectedCell);
    },
    [],
  );

  const handleCellMouseDownForRange = useCallback(
    (
      e: React.MouseEvent,
      rowIndex: number,
      colIndex: number,
      columns: string[],
    ) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setIsCellSelecting(true);
      isCellSelectingRef.current = true;
      setCellSelectionRange({
        anchor: { row: rowIndex, colIndex },
        tip: { row: rowIndex, colIndex },
      });
      setSelectedCell({ row: rowIndex, col: columns[colIndex] });
      selectedCellRef.current = { row: rowIndex, col: columns[colIndex] };
      setSelectedRows(new Set());
      selectedRowsRef.current = new Set();
    },
    [],
  );

  const handleCellMouseMoveForRange = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (!isCellSelectingRef.current) return;
      setCellSelectionRange((prev) => {
        if (!prev) return prev;
        if (prev.tip.row === rowIndex && prev.tip.colIndex === colIndex)
          return prev;
        return { ...prev, tip: { row: rowIndex, colIndex } };
      });
    },
    [],
  );

  const handleCellMouseUpForRange = useCallback(() => {
    setIsCellSelecting(false);
    isCellSelectingRef.current = false;
  }, []);

  const selectSingleRow = useCallback((rowIndex: number) => {
    const nextSelectedRows = new Set([rowIndex]);
    selectedRowsRef.current = nextSelectedRows;
    setSelectedRows(nextSelectedRows);
  }, []);

  const selectRowRange = useCallback((anchor: number, current: number) => {
    const start = Math.min(anchor, current);
    const end = Math.max(anchor, current);
    const next = new Set<number>();
    for (let i = start; i <= end; i++) {
      next.add(i);
    }
    selectedRowsRef.current = next;
    setSelectedRows(next);
  }, []);

  const handleIndexMouseDown = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      if (e.button !== 0) return;
      e.preventDefault();
      selectedCellRef.current = null;
      setSelectedCell(null);
      setIsRowSelecting(true);
      setRowSelectionAnchor(rowIndex);
      selectSingleRow(rowIndex);
    },
    [selectSingleRow],
  );

  const handleIndexMouseEnter = useCallback(
    (rowIndex: number) => {
      if (!isRowSelecting || rowSelectionAnchor === null) return;
      selectRowRange(rowSelectionAnchor, rowIndex);
    },
    [isRowSelecting, rowSelectionAnchor, selectRowRange],
  );

  const clearSelection = useCallback(() => {
    const empty = new Set<number>();
    selectedRowsRef.current = empty;
    setSelectedRows(empty);
    setRowSelectionAnchor(null);
    setIsRowSelecting(false);
    setCellSelectionRange(null);
    setIsCellSelecting(false);
    isCellSelectingRef.current = false;
    selectedCellRef.current = null;
    setSelectedCell(null);
  }, []);

  return {
    selectedCell,
    selectedCellRef,
    setSelectedCell: updateSelectedCell,
    selectedRows,
    selectedRowsRef,
    setSelectedRows: updateSelectedRows,
    cellSelectionRange,
    cellSelectionRangeRef,
    handleCellClick,
    handleCellMouseDownForRange,
    handleCellMouseMoveForRange,
    handleCellMouseUpForRange,
    handleIndexMouseDown,
    handleIndexMouseEnter,
    selectSingleRow,
    clearSelection,
    setIsRowSelecting,
  };
}
```

- [ ] **Step 2: Replace state blocks in TableView.tsx**

Remove lines 531-545 (selectedCell, selectedRows, rowSelectionAnchor, isRowSelecting, cellSelectionRange, isCellSelecting useState + refs), lines 608-628 (handleCellClick), lines 649-682 (handleCellMouseDownForRange, handleCellMouseMoveForRange, handleCellMouseUpForRange), and lines 794-830 (selectSingleRow, selectRowRange, handleIndexMouseDown, handleIndexMouseEnter).

Also remove lines 636-641 (useEffect for selectedCellRef) and lines 608-616 (useEffect for selectedRowsRef).

Replace with:

```ts
const {
  selectedCell,
  selectedCellRef,
  setSelectedCell,
  selectedRows,
  selectedRowsRef,
  setSelectedRows,
  cellSelectionRange,
  cellSelectionRangeRef,
  handleCellClick,
  handleCellMouseDownForRange,
  handleCellMouseMoveForRange,
  handleCellMouseUpForRange,
  handleIndexMouseDown,
  handleIndexMouseEnter,
  selectSingleRow,
  clearSelection,
  setIsRowSelecting,
} = useCellSelection();
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors. Note: `handleCellMouseDownForRange` now takes `columns` as a 4th argument — update call sites in the JSX.

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/hooks/useCellSelection.ts src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract useCellSelection hook from TableView"
```

---

### Task 5: Extract `useCellEditing` hook

**Files:**
- Create: `src/components/business/DataGrid/tableView/hooks/useCellEditing.ts`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 547-570, 474-517, 519-535, 700-760, 832-1131)

- [ ] **Step 1: Create the hook file**

This is the largest hook. It manages:
- `editingCell`, `editValue` — cell editing state
- `pendingChanges`, `insertDraftRows` — mutation tracking
- `primaryKeys`, `tableColumns`, `columnComments`, `clickhouseEngine` — table metadata
- `isSaving`, `saveError`, `deleteDialogOpen`, `isDeleting`, `lastRefreshedAt`, `isRefreshing` — operation state
- Derived: `canInsert`, `canUpdateDelete`, `hasPendingChanges`, `pendingMutationCount`, `mutabilityHint`, `isEditableForUpdates`
- Handlers: `commitEdit`, `cancelEdit`, `handleEditKeyDown`, `handleCellDoubleClick`, `handleSave`, `handleConfirmDelete`, `handleDiscardChanges`, `handleAddDraftRow`, `handleDraftValueChange`, `handleRefreshClick`, `generateUpdateSQL`, `generateInsertSQL`, `buildDeleteSQL`
- `getCellDisplayValue`, `isCellModified` — cell value helpers

The hook signature:

```ts
// src/components/business/DataGrid/tableView/hooks/useCellEditing.ts
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { api } from "@/services/api";
import type { ColumnInfo } from "@/services/api";
import { toast } from "sonner";
import {
  buildDeleteStatement,
  buildUpdateStatement,
  escapeSQL,
  cellValueToString,
  formatSQLValue,
  formatInsertSQLValue,
  getQualifiedTableName,
  isClickHouseMergeTreeEngine,
  canMutateClickHouseTable,
  isInsertColumnRequired,
  quoteIdent,
} from "../utils";

// PendingChange and InsertDraftRow interfaces (move from TableView.tsx)

interface UseCellEditingParams {
  data: any[];
  currentData: any[];
  columns: string[];
  tableContext?: {
    connectionId: number;
    database: string;
    schema: string;
    table: string;
    driver: string;
  };
  onDataRefresh?: (params?: {
    page?: number;
    limit?: number;
    filter?: string;
    orderBy?: string;
  }) => void | Promise<unknown>;
  selectedCell: { row: number; col: string } | null;
  selectedCellRef: React.MutableRefObject<{ row: number; col: string } | null>;
  selectedRows: Set<number>;
  selectedRowsRef: React.MutableRefObject<Set<number>>;
  setSelectedCell: (cell: { row: number; col: string } | null) => void;
  setSelectedRows: (rows: Set<number>) => void;
  clearSelection: () => void;
}
```

Copy all the editing-related state, effects, and callbacks from `TableView.tsx` into this hook. The hook should return:

```ts
return {
  // State
  editingCell,
  editValue,
  pendingChanges,
  insertDraftRows,
  primaryKeys,
  tableColumns,
  columnComments,
  clickhouseEngine,
  isSaving,
  isExporting,
  isRefreshing,
  isDeleting,
  deleteDialogOpen,
  setDeleteDialogOpen,
  lastRefreshedAt,
  saveError,
  setSaveError,
  pendingFocusDraftId,
  // Derived
  canInsert,
  canUpdateDelete,
  hasPendingChanges,
  pendingMutationCount,
  mutabilityHint,
  isEditableForUpdates,
  hasLocalClientSort, // passed through from caller
  // Handlers
  commitEdit,
  cancelEdit,
  handleEditKeyDown,
  handleCellDoubleClick,
  handleSave,
  handleConfirmDelete,
  handleDiscardChanges,
  handleAddDraftRow,
  handleDraftValueChange,
  handleRefreshClick,
  generateUpdateSQL,
  generateInsertSQL,
  buildDeleteSQL,
  getCellDisplayValue,
  isCellModified,
  // Refs
  editInputRef,
  saveButtonRef,
  commitEditRef,
  editingCellRef,
};
```

- [ ] **Step 2: Replace state blocks in TableView.tsx**

Remove all editing-related state declarations, effects, and callbacks. Replace with a single hook call. The `isExporting` and `handleExport` should be kept separate (Task 6).

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/hooks/useCellEditing.ts src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract useCellEditing hook from TableView"
```

---

### Task 6: Extract `useTableMutation` hook

**Files:**
- Create: `src/components/business/DataGrid/tableView/hooks/useTableMutation.ts`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 391-472)

- [ ] **Step 1: Create the hook file**

```ts
// src/components/business/DataGrid/tableView/hooks/useTableMutation.ts
import { useState, useCallback } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { api, isTauri } from "@/services/api";
import type { TransferFormat } from "@/services/api";
import { toast } from "sonner";

interface UseTableMutationParams {
  tableContext?: {
    connectionId: number;
    database: string;
    schema: string;
    table: string;
    driver: string;
  };
  controlledFilter?: string;
  orderByInput: string;
  activeSortColumn?: string;
  activeSortDirection?: "asc" | "desc";
  page: number;
  pageSize: number;
}

export function useTableMutation({
  tableContext,
  controlledFilter,
  orderByInput,
  activeSortColumn,
  activeSortDirection,
  page,
  pageSize,
}: UseTableMutationParams) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (
      scope: "current_page" | "filtered" | "full_table",
      format: TransferFormat,
    ) => {
      if (!tableContext) return;
      if (!isTauri()) {
        toast.error("Export dialog is only available in Tauri desktop mode.");
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const defaultPath = `${tableContext.table}_${timestamp}.${format}`;
      const filters =
        format === "csv"
          ? [{ name: "CSV", extensions: ["csv"] }]
          : format === "json"
            ? [{ name: "JSON", extensions: ["json"] }]
            : [{ name: "SQL", extensions: ["sql"] }];

      let filePath: string | undefined;
      try {
        const selected = await save({
          title: "Save Export File",
          defaultPath,
          filters,
        });
        if (!selected) return;
        filePath = Array.isArray(selected) ? selected[0] : selected;
        if (!filePath) return;
      } catch (e) {
        toast.error("Failed to open save dialog", {
          description: e instanceof Error ? e.message : String(e),
        });
        return;
      }

      setIsExporting(true);
      try {
        const result = await api.transfer.exportTable({
          id: tableContext.connectionId,
          database: tableContext.database,
          schema: tableContext.schema,
          table: tableContext.table,
          driver: tableContext.driver,
          format,
          scope,
          filter: controlledFilter || undefined,
          orderBy: orderByInput || undefined,
          sortColumn: activeSortColumn,
          sortDirection: activeSortDirection,
          page,
          limit: pageSize,
          filePath,
        });
        toast.success(`Export completed (${result.rowCount} rows)`, {
          description: result.filePath,
        });
      } catch (e) {
        toast.error("Export failed", {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setIsExporting(false);
      }
    },
    [
      tableContext,
      controlledFilter,
      orderByInput,
      activeSortColumn,
      activeSortDirection,
      page,
      pageSize,
    ],
  );

  return { isExporting, handleExport };
}
```

- [ ] **Step 2: Replace state blocks in TableView.tsx**

Remove lines 391-472 (handleExport callback) and line 573 (isExporting useState). Replace with:

```ts
const { isExporting, handleExport } = useTableMutation({
  tableContext,
  controlledFilter,
  orderByInput,
  activeSortColumn,
  activeSortDirection,
  page,
  pageSize,
});
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/hooks/useTableMutation.ts src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract useTableMutation hook from TableView"
```

---

### Task 7: Extract `useTableSearch` hook

**Files:**
- Create: `src/components/business/DataGrid/tableView/hooks/useTableSearch.ts`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 579-583, 1413-1583)

- [x] **Step 1: Create the hook file**

```ts
// src/components/business/DataGrid/tableView/hooks/useTableSearch.ts
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { collectSearchMatches } from "../utils";

interface UseTableSearchParams {
  currentData: any[];
  columns: string[];
  editingCell: { row: number; col: string } | null;
  commitEdit: () => void;
  getCellDisplayValue: (
    rowIndex: number,
    column: string,
    originalValue: any,
  ) => any;
}

export function useTableSearch({
  currentData,
  columns,
  editingCell,
  commitEdit,
  getCellDisplayValue,
}: UseTableSearchParams) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCursorIndex, setSearchCursorIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();

  const searchMatches = useMemo(
    () =>
      collectSearchMatches(
        currentData,
        columns,
        normalizedSearchKeyword,
        getCellDisplayValue,
      ),
    [normalizedSearchKeyword, currentData, columns, getCellDisplayValue],
  );

  const matchedRows = useMemo(() => {
    const rows = new Set<number>();
    searchMatches.forEach((match) => rows.add(match.row));
    return rows;
  }, [searchMatches]);

  const matchedCellKeys = useMemo(() => {
    const keys = new Set<string>();
    searchMatches.forEach((match) => keys.add(`${match.row}::${match.col}`));
    return keys;
  }, [searchMatches]);

  const currentSearchMatch =
    searchCursorIndex >= 0 && searchCursorIndex < searchMatches.length
      ? searchMatches[searchCursorIndex]
      : null;

  const focusSearchInput = useCallback(() => {
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const jumpToSearchMatch = useCallback(
    (matchIndex: number) => {
      if (!searchMatches.length) return;
      const safeIndex =
        ((matchIndex % searchMatches.length) + searchMatches.length) %
        searchMatches.length;
      const nextMatch = searchMatches[safeIndex];

      if (editingCell) {
        commitEdit();
      }

      return { match: nextMatch, index: safeIndex };
    },
    [searchMatches, editingCell, commitEdit],
  );

  const handleSearchEnter = useCallback(() => {
    if (!searchMatches.length) return;
    const nextIndex = searchCursorIndex < 0 ? 0 : searchCursorIndex + 1;
    return jumpToSearchMatch(nextIndex);
  }, [searchMatches, searchCursorIndex, jumpToSearchMatch]);

  useEffect(() => {
    setSearchCursorIndex(-1);
  }, [normalizedSearchKeyword]);

  useEffect(() => {
    if (!searchMatches.length) {
      setSearchCursorIndex(-1);
      return;
    }
    if (searchCursorIndex >= searchMatches.length) {
      setSearchCursorIndex(0);
    }
  }, [searchMatches, searchCursorIndex]);

  useEffect(() => {
    if (isSearchOpen) {
      focusSearchInput();
    }
  }, [isSearchOpen, focusSearchInput]);

  return {
    isSearchOpen,
    setIsSearchOpen,
    searchKeyword,
    setSearchKeyword,
    searchCursorIndex,
    setSearchCursorIndex,
    searchInputRef,
    normalizedSearchKeyword,
    searchMatches,
    matchedRows,
    matchedCellKeys,
    currentSearchMatch,
    focusSearchInput,
    jumpToSearchMatch,
    handleSearchEnter,
  };
}
```

- [x] **Step 2: Replace state blocks in TableView.tsx**

Remove lines 579-583 (isSearchOpen, searchKeyword, searchCursorIndex useState), lines 1413-1583 (all search-related computed values, useEffects, and handlers). Replace with:

```ts
const {
  isSearchOpen,
  setIsSearchOpen,
  searchKeyword,
  setSearchKeyword,
  searchCursorIndex,
  setSearchCursorIndex,
  searchInputRef,
  normalizedSearchKeyword,
  searchMatches,
  matchedRows,
  matchedCellKeys,
  currentSearchMatch,
  focusSearchInput,
  jumpToSearchMatch,
  handleSearchEnter,
} = useTableSearch({
  currentData,
  columns,
  editingCell,
  commitEdit,
  getCellDisplayValue,
});
```

Note: `jumpToSearchMatch` now returns `{ match, index }` instead of directly setting state. The caller (hotkey handler) needs to call `setSelectedCell` and `setSearchCursorIndex` with the returned values.

- [x] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [x] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/hooks/useTableSearch.ts src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract useTableSearch hook from TableView"
```

---

### Task 8: Extract `TableStatusBar` sub-component

**Files:**
- Create: `src/components/business/DataGrid/tableView/TableStatusBar.tsx`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 2910-2935)

- [ ] **Step 1: Create the component file**

```tsx
// src/components/business/DataGrid/tableView/TableStatusBar.tsx
import { memo } from "react";

interface TableStatusBarProps {
  executionTimeMs: number;
  sortedDataLength: number;
  normalizedSearchKeyword: string;
  matchedRowsSize: number;
  searchKeyword: string;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  hasPendingChanges: boolean;
  pendingMutationCount: number;
}

export const TableStatusBar = memo(function TableStatusBar({
  executionTimeMs,
  sortedDataLength,
  normalizedSearchKeyword,
  matchedRowsSize,
  searchKeyword,
  isRefreshing,
  lastRefreshedAt,
  hasPendingChanges,
  pendingMutationCount,
}: TableStatusBarProps) {
  return (
    <div className="flex items-center px-4 py-1 border-t border-border bg-muted/40">
      <div className="text-sm text-muted-foreground">
        Query executed in{" "}
        {executionTimeMs ? (executionTimeMs / 1000).toFixed(3) : "0.000"}s •{" "}
        {sortedDataLength} rows returned
        {normalizedSearchKeyword && (
          <span className="ml-2">
            • {matchedRowsSize} row(s) matched "{searchKeyword.trim()}"
          </span>
        )}
        {isRefreshing && <span className="ml-2">• Refreshing…</span>}
        {lastRefreshedAt && !isRefreshing && (
          <span className="ml-2">
            • Updated {lastRefreshedAt.toLocaleTimeString()}
          </span>
        )}
        {hasPendingChanges && (
          <span className="text-orange-600 dark:text-orange-400 ml-2">
            • {pendingMutationCount} unsaved change(s)
          </span>
        )}
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Replace the JSX in TableView.tsx**

Replace the status bar div (lines 2910-2935) with:

```tsx
<TableStatusBar
  executionTimeMs={executionTimeMs}
  sortedDataLength={sortedData.length}
  normalizedSearchKeyword={normalizedSearchKeyword}
  matchedRowsSize={matchedRows.size}
  searchKeyword={searchKeyword}
  isRefreshing={isRefreshing}
  lastRefreshedAt={lastRefreshedAt}
  hasPendingChanges={hasPendingChanges}
  pendingMutationCount={pendingMutationCount}
/>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/TableStatusBar.tsx src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract TableStatusBar sub-component"
```

---

### Task 9: Extract `DraftRows` sub-component

**Files:**
- Create: `src/components/business/DataGrid/tableView/DraftRows.tsx`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 2632-2669)

- [ ] **Step 1: Create the component file**

```tsx
// src/components/business/DataGrid/tableView/DraftRows.tsx
import { memo } from "react";

interface InsertDraftRow {
  tempId: string;
  values: Record<string, string>;
}

interface DraftRowsProps {
  insertDraftRows: InsertDraftRow[];
  columns: string[];
  getColWidth: (column: string) => number;
  handleDraftValueChange: (tempId: string, column: string, value: string) => void;
}

export const DraftRows = memo(function DraftRows({
  insertDraftRows,
  columns,
  getColWidth,
  handleDraftValueChange,
}: DraftRowsProps) {
  if (insertDraftRows.length === 0) return null;

  return (
    <>
      {insertDraftRows.map((draft, draftIndex) => (
        <tr
          key={draft.tempId}
          className="border-b border-border bg-emerald-500/5"
        >
          <td className="px-4 py-2 text-xs text-emerald-700 dark:text-emerald-300 border-r border-border font-medium">
            new
            {insertDraftRows.length > 1 ? ` ${draftIndex + 1}` : ""}
          </td>
          {columns.map((column, colIndex) => (
            <td
              key={`${draft.tempId}_${column}`}
              className="px-0 py-0 text-sm text-foreground font-mono border-r border-border"
              style={{
                width: getColWidth(column),
                minWidth: 50,
              }}
            >
              <input
                type="text"
                autoCapitalize="none"
                data-draft-id={draft.tempId}
                data-draft-col-index={colIndex}
                className="w-full h-full px-4 py-2 bg-transparent outline-none"
                placeholder={column}
                value={draft.values[column] ?? ""}
                onChange={(e) =>
                  handleDraftValueChange(
                    draft.tempId,
                    column,
                    e.target.value,
                  )
                }
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
});
```

- [ ] **Step 2: Replace the JSX in TableView.tsx**

Replace lines 2632-2669 with:

```tsx
<DraftRows
  insertDraftRows={insertDraftRows}
  columns={columns}
  getColWidth={getColWidth}
  handleDraftValueChange={handleDraftValueChange}
/>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/DraftRows.tsx src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract DraftRows sub-component"
```

---

### Task 10: Extract `TableContextMenuContent` sub-component

**Files:**
- Create: `src/components/business/DataGrid/tableView/TableContextMenuContent.tsx`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines 2683-2857)

- [ ] **Step 1: Create the component file**

Move the context menu content from TableView.tsx into a standalone component. This component receives `contextMenuRow`, `currentData`, `selectedRows`, `selectedCell`, `tableColumns`, `tableContext`, and all the copy/filter handlers as props.

```tsx
// src/components/business/DataGrid/tableView/TableContextMenuContent.tsx
import { memo } from "react";
import { Copy, Filter, Files, Table as TableIcon, Undo2 } from "lucide-react";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  formatCellValue,
  isNumericType,
  isStringType,
  isDateType,
  buildFilterExpression,
} from "./utils";

// ... props interface with all needed data + handlers

export const TableContextMenuContent = memo(function TableContextMenuContent({
  // ... props
}: TableContextMenuContentProps) {
  // ... moved JSX
});
```

- [ ] **Step 2: Replace the JSX in TableView.tsx**

Replace the context menu content block with:

```tsx
<TableContextMenuContent
  contextMenuRow={contextMenuRow}
  currentData={currentData}
  selectedRows={selectedRows}
  selectedCell={selectedCell}
  columns={columns}
  tableColumns={tableColumns}
  tableContext={tableContext}
  onFilterChange={onFilterChange}
  // ... all handlers
/>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/TableContextMenuContent.tsx src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract TableContextMenuContent sub-component"
```

---

### Task 11: Extract `VirtualTableBody` sub-component

**Files:**
- Create: `src/components/business/DataGrid/tableView/VirtualTableBody.tsx`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines ~2336-2680)

- [ ] **Step 1: Create the component file**

This component owns:
- `<table>` with `<colgroup>` and `tableWidthPx`
- Sticky `<thead>` with column headers (sort, resize, copy)
- Virtualized `<tbody>` with spacer rows
- `DataRow` rendering (already extracted)
- `DraftRows` integration
- Bottom spacer

```tsx
// src/components/business/DataGrid/tableView/VirtualTableBody.tsx
import { memo, useRef, useCallback } from "react";
import type { Virtualizer } from "@tanstack/react-virtual";
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataRow } from "./DataRow";  // Note: DataRow is in the same directory level
import { DraftRows } from "./DraftRows";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { createSingleAndDoubleClickHandler } from "./utils";

interface VirtualTableBodyProps {
  columns: string[];
  currentData: any[];
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  startIndex: number;
  // ... all other props needed by DataRow and header
}

export const VirtualTableBody = memo(function VirtualTableBody(props: VirtualTableBodyProps) {
  // ... moved JSX
});
```

- [ ] **Step 2: Replace the JSX in TableView.tsx**

Replace the virtual table section with:

```tsx
<VirtualTableBody
  columns={columns}
  currentData={currentData}
  virtualizer={virtualizer}
  startIndex={startIndex}
  // ... all other props
/>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/VirtualTableBody.tsx src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract VirtualTableBody sub-component"
```

---

### Task 12: Extract `ColumnViewBody` sub-component

**Files:**
- Create: `src/components/business/DataGrid/tableView/ColumnViewBody.tsx`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines ~2169-2334)

- [ ] **Step 1: Create the component file**

```tsx
// src/components/business/DataGrid/tableView/ColumnViewBody.tsx
import { memo } from "react";
import { isComplexValue, formatCellValue } from "./utils";

interface ColumnViewBodyProps {
  columns: string[];
  currentData: any[];
  startIndex: number;
  showRowNumbers: boolean;
  showZebraStripes: boolean;
  showColumnComments: boolean;
  columnComments: Record<string, string>;
  normalizedSearchKeyword: string;
  matchedCellKeys: Set<string>;
  isEditableForUpdates: boolean;
  editingCell: { row: number; col: string } | null;
  selectedCell: { row: number; col: string } | null;
  editValue: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  getCellDisplayValue: (rowIndex: number, column: string, originalValue: any) => any;
  isCellModified: (rowIndex: number, column: string) => boolean;
  isCellInRange: (rowIndex: number, colIndex: number) => boolean;
  handleCellClick: (rowIndex: number, col: string) => void;
  handleCellDoubleClick: (rowIndex: number, col: string, currentValue: any) => void;
  handleCellMouseDownForRange: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void;
  handleCellMouseMoveForRange: (rowIndex: number, colIndex: number) => void;
  handleEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setEditValue: (value: string) => void;
  commitEdit: () => void;
  setComplexViewer: (viewer: { value: any; columnName: string } | null) => void;
  cellSelectionRange: { anchor: { row: number; colIndex: number }; tip: { row: number; colIndex: number } } | null;
}

export const ColumnViewBody = memo(function ColumnViewBody(props: ColumnViewBodyProps) {
  // ... moved JSX from the column view branch
});
```

- [ ] **Step 2: Replace the JSX in TableView.tsx**

Replace the column view branch with:

```tsx
<ColumnViewBody
  columns={columns}
  currentData={currentData}
  startIndex={startIndex}
  // ... all other props
/>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/ColumnViewBody.tsx src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract ColumnViewBody sub-component"
```

---

### Task 13: Extract `TableToolbar` sub-component

**Files:**
- Create: `src/components/business/DataGrid/tableView/TableToolbar.tsx`
- Modify: `src/components/business/DataGrid/TableView.tsx` (replace lines ~1737-2165)

- [ ] **Step 1: Create the component file**

This is the largest sub-component. It contains:
- Pagination controls (prev/next, page input, page size selector)
- Refresh button
- View mode toggle
- Search popover
- DDL/ER/Query buttons
- Insert/Delete buttons
- Save/Discard buttons (with pending changes indicator)
- Export dropdown
- WHERE/ORDER BY filter inputs
- Mutability hint

```tsx
// src/components/business/DataGrid/tableView/TableToolbar.tsx
import { memo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ArrowUpDown, Columns, Rows, Download, FileCode, Filter,
  Loader2, Plus, RotateCw, Save, Search, SquareTerminal,
  Table, Trash2, Undo2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnAutocompleteInput } from "./ColumnAutocompleteInput";

const PAGE_SIZE_OPTIONS = ["10", "50", "100", "200", "500", "1000"] as const;

interface TableToolbarProps {
  // ... all toolbar props
}

export const TableToolbar = memo(function TableToolbar(props: TableToolbarProps) {
  // ... moved JSX
});
```

- [ ] **Step 2: Replace the JSX in TableView.tsx**

Replace the entire toolbar section with:

```tsx
<TableToolbar
  // ... all props
/>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/business/DataGrid/tableView/TableToolbar.tsx src/components/business/DataGrid/TableView.tsx
git commit -m "refactor: extract TableToolbar sub-component"
```

---

### Task 14: Final cleanup and verification

**Files:**
- Modify: `src/components/business/DataGrid/TableView.tsx`

- [ ] **Step 1: Verify TableView.tsx is under 400 lines**

Run: `wc -l src/components/business/DataGrid/TableView.tsx`
Expected: ~300-400 lines

- [ ] **Step 2: Remove unused imports from TableView.tsx**

Remove any imports that are no longer needed in the main file (they should now be in the sub-components or hooks).

- [ ] **Step 3: Verify no unused variables**

Run: `npx tsc --noEmit`
Expected: No type errors, no unused variable warnings

- [ ] **Step 4: Run existing unit tests**

Run: `npx vitest run src/components/business/DataGrid/tableView/`
Expected: All existing tests pass (utils.unit.test.ts, selectionCopy.unit.test.ts, columnAutocomplete.unit.test.ts)

- [ ] **Step 5: Run full build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "refactor: TableView.tsx decomposition complete — 7 hooks + 7 sub-components"
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `TableView.tsx` is under 400 lines
- [ ] No file in `tableView/` exceeds 300 lines
- [ ] All existing unit tests pass
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` has no errors
- [ ] External API (`TableViewProps`) is unchanged
- [ ] `DataRow` still uses `React.memo` (already done)
- [ ] New sub-components use `React.memo`
- [ ] Manual smoke test: open a table, edit a cell, search, sort, paginate, copy/paste, export
