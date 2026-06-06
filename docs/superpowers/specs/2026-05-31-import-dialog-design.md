# Import Connection Dialog Design

## Summary

Replace the minimal upload button in the sidebar with a proper import dialog triggered via right-click context menu. The dialog presents two clear source options (Navicat / DBeaver) as cards, then opens the system file picker for the selected format.

## Motivation

The current import flow is a small upload icon button in the sidebar header with no indication of what it does or what formats are supported. Users need a clear, discoverable way to import connections from Navicat and DBeaver.

## Goals

1. Clear visual indication of import sources (Navicat vs DBeaver)
2. Discoverable entry point via right-click context menu
3. Clean separation from existing ConnectionDialog
4. No backend changes required

## Non-Goals

- Preview/selection of individual connections before import (Approach 3 from brainstorming)
- Bulk import from multiple files in one session
- Support for additional import formats beyond Navicat and DBeaver

## Overall Flow

```
Right-click sidebar blank area → Context menu appears
→ Click "导入连接" → ImportDialog opens (two cards)
→ Click Navicat or DBeaver card → System file picker opens (filtered format)
→ Select file → Call api.connections.importFromFile()
→ Success: toast + dialog auto-close + refresh connection list
→ Failure: toast error + dialog stays open
```

## Component Changes

### New: `ImportDialog.tsx`

Location: `src/components/business/Sidebar/ImportDialog.tsx`

Props:

```typescript
interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

Dialog content:
- Title: "导入数据库连接"
- Subtitle: "选择要导入的连接来源"
- Two cards centered:
  - **Navicat**: Blue border, `FileUp` icon from lucide-react (representing file import), "Navicat" title, "导入 .ncx 文件" subtitle, "XML 格式" gray text
  - **DBeaver**: Green border, `FileJson` icon from lucide-react (representing JSON file), "DBeaver" title, "导入 .json 文件" subtitle, "data-sources.json" gray text
- Cancel button centered at bottom

Interaction:
- Click card → `open()` system file picker with format-specific filter (`.ncx` for Navicat, `.json` for DBeaver)
- After file selection → immediately call `api.connections.importFromFile(filePath)`
- Loading state: Loader2 spinning icon replaces card content
- Success: `toast.success()` + `onOpenChange(false)` + `fetchConnections()`
- Failure: `toast.error()` with error message, dialog stays open
- Cancel file selection: no action, dialog stays open

Uses existing UI components:
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` from `@/components/ui/dialog`
- `Button` from `@/components/ui/button`
- `Loader2` icon from `lucide-react`

### New: `ConnectionContextMenu.tsx`

Location: `src/components/business/Sidebar/ConnectionContextMenu.tsx`

A right-click context menu component for the sidebar blank area.

Menu items:
- **新建连接** — Opens existing ConnectionDialog in create mode
- **导入连接** — Opens new ImportDialog

Implementation:
- Uses `ContextMenu`, `ContextMenuContent`, `ContextMenuTrigger`, `ContextMenuItem` from `@/components/ui/context-menu`
- Trigger area: the connection list scroll container div
- Must distinguish between right-click on a connection item (existing per-connection menu) vs right-click on blank area (this new global menu)

### Modified: `ConnectionList.tsx`

Location: `src/components/business/Sidebar/ConnectionList.tsx`

Changes:
1. **Remove** the upload icon button (lines 3019-3026) and its `handleImportConnections` function (lines 2853-2891)
2. **Add** `isImportDialogOpen` state
3. **Add** right-click context menu wrapper around the connection list container
4. **Import** and render `ImportDialog` component
5. **Wire** "新建连接" context menu item to existing `openConnectionDialog()` in create mode

## Backend Changes

**None.** The existing `import_connections` Tauri command and `import_from_file` Rust function already support both formats via file extension detection. The TypeScript API `api.connections.importFromFile(filePath)` signature is unchanged.

## Error Handling

| Scenario | Handling |
|----------|----------|
| User cancels file selection | Dialog stays open, no notification |
| File format unsupported | File picker filters prevent this |
| File content parse failure | `toast.error()` with error details, dialog stays open |
| All connections skipped (already exist) | `toast.info("0 imported, N skipped")`, dialog closes |
| Partial import success | `toast.success()` for imported count, `toast.info()` for skipped count, dialog closes |
| Network/filesystem error | `toast.error()` with error details, dialog stays open |

## Files Changed

| File | Operation |
|------|-----------|
| `src/components/business/Sidebar/ImportDialog.tsx` | **New** |
| `src/components/business/Sidebar/ConnectionContextMenu.tsx` | **New** |
| `src/components/business/Sidebar/ConnectionList.tsx` | **Modify** — remove upload button, add context menu and dialog state |

## UI Components Used

All from existing shadcn/ui library:
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- `Button`
- `ContextMenu`, `ContextMenuContent`, `ContextMenuTrigger`, `ContextMenuItem`
- `Loader2`, `FileUp`, `FileJson` icons from lucide-react
