# Cell Editing E2E Tests Design

## Problem

The DataGrid's cell editing functionality (double-click to edit, commit/cancel, save/discard, modified cell indicator) has no E2E test coverage. This is a high-frequency operation that needs regression protection.

## Scope

**Core editing flow only** (5 tests). Does NOT cover: draft rows, delete selected rows, Tab navigation, keyboard shortcuts, no-PK disabled state, or sort-disabled state.

## Approach

Add `test.describe("Cell Editing", ...)` to existing `e2e/datagrid.spec.ts` after the "Row Mutation" block.

## Tests

### 1. `double-click cell to enter edit mode`
- Double-click cell at `[data-row-index="0"][data-col-index="1"]` (alice's username)
- Assert `<input>` appears inside the cell
- Assert input value is "alice"

### 2. `commit edit with Enter`
- Double-click cell → clear → type "edited_name" → press Enter
- Assert cell text shows "edited_name"
- Assert cell has modified indicator (`border-l-orange-400`)
- Assert Save button visible

### 3. `cancel edit with Escape`
- Double-click cell → clear → type "should_not_persist" → press Escape
- Assert cell text shows original "alice"
- Assert Save button hidden

### 4. `commit edit on blur (click away)`
- Double-click cell → clear → type "blurred" → click another cell
- Assert first cell shows "blurred"

### 5. `save and discard changes`
- Double-click cell → edit → Enter → click Save → assert Save disappears
- Edit again → click Discard → assert original value restored

## Cell Targeting

Use `data-row-index` and `data-col-index` attributes on `<td>` elements (present in `VirtualTableBody.tsx:172-173`).

## Mock Context

- `users` table has `id` as primary key → editing enabled
- Mock `executeQuery` accepts any SQL → save operations succeed
- `alice` is row 0, column index 1 = `username`
