# Import Connection Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal upload button with a proper import dialog triggered via right-click context menu, offering clear Navicat/DBeaver source selection.

**Architecture:** New standalone `ImportDialog` component with two source cards, new `ConnectionContextMenu` component for the sidebar right-click menu, and modifications to `ConnectionList.tsx` to integrate both. No backend changes.

**Tech Stack:** React, shadcn/ui (Dialog, ContextMenu), lucide-react icons, react-i18next, Tauri dialog plugin

---

## File Structure

| File | Operation | Responsibility |
|------|-----------|----------------|
| `src/components/business/Sidebar/ImportDialog.tsx` | **Create** | Standalone import dialog with Navicat/DBeaver source cards |
| `src/components/business/Sidebar/ConnectionContextMenu.tsx` | **Create** | Right-click context menu for sidebar blank area |
| `src/components/business/Sidebar/ConnectionList.tsx` | **Modify** | Remove upload button, add context menu + dialog integration |
| `src/lib/i18n/locales/en.ts` | **Modify** | Add English translation keys for new UI |
| `src/lib/i18n/locales/zh.ts` | **Modify** | Add Chinese translation keys for new UI |

---

### Task 1: Add i18n Translation Keys

**Files:**
- Modify: `src/lib/i18n/locales/en.ts`
- Modify: `src/lib/i18n/locales/zh.ts`

- [ ] **Step 1: Add English keys to `en.ts`**

Open `src/lib/i18n/locales/en.ts`. Inside the `connection` object, add a new `connectionImportDialog` subsection (NOT `importDialog` — that's for SQL import). Place it after the existing `importDialog` block:

```typescript
connectionImportDialog: {
  title: "Import Database Connections",
  description: "Select the source to import connections from",
  navicat: "Navicat",
  navicatDescription: "Import .ncx files",
  navicatFormat: "XML format",
  dbeaver: "DBeaver",
  dbeaverDescription: "Import .json files",
  dbeaverFormat: "data-sources.json",
  cancel: "Cancel",
},
```

Also add to the `connection.menu` object:

```typescript
importConnections: "Import Connections",
```

- [ ] **Step 2: Add Chinese keys to `zh.ts`**

Open `src/lib/i18n/locales/zh.ts`. Inside the `connection` object, add the corresponding Chinese keys. Place after the existing `importDialog` block:

```typescript
connectionImportDialog: {
  title: "导入数据库连接",
  description: "选择要导入的连接来源",
  navicat: "Navicat",
  navicatDescription: "导入 .ncx 文件",
  navicatFormat: "XML 格式",
  dbeaver: "DBeaver",
  dbeaverDescription: "导入 .json 文件",
  dbeaverFormat: "data-sources.json",
  cancel: "取消",
},
```

Also add to the `connection.menu` object:

```typescript
importConnections: "导入连接",
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors. If there are type errors about missing keys, the `Translations` type in `en.ts` will enforce them.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/locales/en.ts src/lib/i18n/locales/zh.ts
git commit -m "feat(i18n): add translation keys for connection import dialog"
```

---

### Task 2: Create ImportDialog Component

**Files:**
- Create: `src/components/business/Sidebar/ImportDialog.tsx`

- [ ] **Step 1: Create the ImportDialog component**

Create `src/components/business/Sidebar/ImportDialog.tsx` with the following content:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { Loader2, FileUp, FileJson } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { toast } from "sonner";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type Source = "navicat" | "dbeaver";

export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<Source | null>(null);

  const handleImport = async (source: Source) => {
    const filters =
      source === "navicat"
        ? [{ name: "Navicat NCX", extensions: ["ncx"] }]
        : [{ name: "DBeaver JSON", extensions: ["json"] }];

    const selected = await open({ multiple: false, filters });
    if (!selected) return;

    const filePath = Array.isArray(selected) ? selected[0] : selected;
    if (!filePath) return;

    setLoading(source);
    try {
      const result = await api.connections.importFromFile(filePath);
      if (result.imported.length > 0) {
        toast.success(
          t("connection.toast.importConnectionsSuccess", {
            count: result.imported.length,
          }),
        );
      }
      if (result.skipped > 0) {
        toast.info(
          t("connection.toast.importConnectionsSkipped", {
            count: result.skipped,
          }),
        );
      }
      if (result.imported.length === 0 && result.skipped === 0) {
        toast.info(t("connection.toast.importConnectionsSuccess", { count: 0 }));
      }
      onImported();
      onOpenChange(false);
    } catch (e) {
      toast.error(t("connection.toast.importConnectionsFailed"), {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("connection.connectionImportDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("connection.connectionImportDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 justify-center py-4">
          <button
            onClick={() => handleImport("navicat")}
            disabled={loading !== null}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-blue-400/50 bg-blue-400/5 hover:bg-blue-400/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-40"
          >
            {loading === "navicat" ? (
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            ) : (
              <FileUp className="w-8 h-8 text-blue-400" />
            )}
            <span className="font-medium text-sm">
              {t("connection.connectionImportDialog.navicat")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("connection.connectionImportDialog.navicatDescription")}
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {t("connection.connectionImportDialog.navicatFormat")}
            </span>
          </button>

          <button
            onClick={() => handleImport("dbeaver")}
            disabled={loading !== null}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-green-400/50 bg-green-400/5 hover:bg-green-400/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-40"
          >
            {loading === "dbeaver" ? (
              <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
            ) : (
              <FileJson className="w-8 h-8 text-green-400" />
            )}
            <span className="font-medium text-sm">
              {t("connection.connectionImportDialog.dbeaver")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("connection.connectionImportDialog.dbeaverDescription")}
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {t("connection.connectionImportDialog.dbeaverFormat")}
            </span>
          </button>
        </div>

        <div className="flex justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("connection.connectionImportDialog.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Sidebar/ImportDialog.tsx
git commit -m "feat: add ImportDialog component with Navicat/DBeaver source cards"
```

---

### Task 3: Create ConnectionContextMenu Component

**Files:**
- Create: `src/components/business/Sidebar/ConnectionContextMenu.tsx`

- [ ] **Step 1: Create the ConnectionContextMenu component**

Create `src/components/business/Sidebar/ConnectionContextMenu.tsx` with the following content:

```tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Download } from "lucide-react";

interface ConnectionContextMenuProps {
  onNewConnection: () => void;
  onImportConnection: () => void;
  children: (props: {
    onContextMenu: (e: React.MouseEvent) => void;
  }) => React.ReactNode;
}

export function ConnectionContextMenu({
  onNewConnection,
  onImportConnection,
  children,
}: ConnectionContextMenuProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ visible: true, x: e.clientX, y: e.clientY });
  }, []);

  const handleClose = useCallback(() => {
    setMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (!menu.visible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menu.visible, handleClose]);

  return (
    <>
      {children({ onContextMenu: handleContextMenu })}
      {menu.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-md shadow-lg py-1"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              handleClose();
              onNewConnection();
            }}
          >
            <Plus className="w-4 h-4" />
            {t("connection.menu.newConnection")}
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              handleClose();
              onImportConnection();
            }}
          >
            <Download className="w-4 h-4" />
            {t("connection.menu.importConnections")}
          </button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Add missing translation keys**

The `connection.menu.newConnection` key may not exist. Check `en.ts` and `zh.ts` for existing "new connection" menu keys. If `connection.menu.new` or similar exists, use that. If not, add:

In `en.ts` `connection.menu`:
```typescript
newConnection: "New Connection",
```

In `zh.ts` `connection.menu`:
```typescript
newConnection: "新建连接",
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/business/Sidebar/ConnectionContextMenu.tsx src/lib/i18n/locales/en.ts src/lib/i18n/locales/zh.ts
git commit -m "feat: add ConnectionContextMenu for sidebar right-click menu"
```

---

### Task 4: Integrate into ConnectionList.tsx

**Files:**
- Modify: `src/components/business/Sidebar/ConnectionList.tsx`

- [ ] **Step 1: Add new imports**

At the top of `ConnectionList.tsx`, add imports for the new components. Place after the existing component imports:

```typescript
import { ImportDialog } from "./ImportDialog";
import { ConnectionContextMenu } from "./ConnectionContextMenu";
```

Also add `FileUp` and `FileJson` to the lucide-react import if not already present (they are NOT currently imported in ConnectionList.tsx):

```typescript
import {
  // ... existing icons ...
  FileUp,
  FileJson,
} from "lucide-react";
```

- [ ] **Step 2: Add ImportDialog state**

Inside the `ConnectionList` component function, add a new state variable near the other dialog states (around line 662):

```typescript
const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
```

- [ ] **Step 3: Remove the old upload button**

Delete the upload button (lines 3019-3026 approximately):

```tsx
// DELETE THIS BLOCK:
<Button
  variant="ghost"
  size="sm"
  className="h-6 w-6 p-0"
  onClick={handleImportConnections}
>
  <Upload className="w-3.5 h-3.5" />
</Button>
```

- [ ] **Step 4: Remove the old handleImportConnections function**

Delete the entire `handleImportConnections` function (lines 2853-2891 approximately):

```typescript
// DELETE THIS ENTIRE FUNCTION:
const handleImportConnections = async () => {
  // ... all lines through the closing brace
};
```

- [ ] **Step 5: Remove the Upload icon import**

Remove `Upload` from the lucide-react import since it's no longer used:

```typescript
import {
  // ... keep other icons ...
  // Upload,  <-- REMOVE THIS LINE
} from "lucide-react";
```

- [ ] **Step 6: Wrap the scroll container with ConnectionContextMenu**

Find the scroll container div (around line 3090):

```tsx
<div
  className="flex-1 overflow-auto"
  onClick={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
>
  {filteredConnections.map((connection) => { ... })}
</div>
```

Replace it with:

```tsx
<ConnectionContextMenu
  onNewConnection={openCreateDialog}
  onImportConnection={() => setIsImportDialogOpen(true)}
>
  {({ onContextMenu }) => (
    <div
      className="flex-1 overflow-auto"
      onClick={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
      onContextMenu={(e) => {
        // Only trigger global menu if right-clicking on blank area (not on a connection item)
        const target = e.target as HTMLElement;
        if (target.closest("[data-connection-item]")) return;
        onContextMenu(e);
      }}
    >
      {filteredConnections.map((connection) => { ... })}
    </div>
  )}
</ConnectionContextMenu>
```

**IMPORTANT:** The `data-connection-item` attribute needs to be added to connection tree nodes. Check how the per-connection context menu is triggered — the `onContextMenu` prop on `TreeNode` components. The global menu should only fire when right-clicking on the blank area of the scroll container, not on connection items. 

If the `TreeNode` component calls `e.stopPropagation()` on its own `onContextMenu`, then the global handler won't fire on connection items. Verify this by checking the `TreeNode` component's context menu handling. If it does stopPropagation, no `data-connection-item` check is needed.

- [ ] **Step 7: Add ImportDialog component**

Near the `ConnectionDialog` rendering (around line 3036), add the `ImportDialog`:

```tsx
<ImportDialog
  open={isImportDialogOpen}
  onOpenChange={setIsImportDialogOpen}
  onImported={fetchConnections}
/>
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 9: Run the dev server and test manually**

Run: `npm run tauri dev`

Test checklist:
- [ ] Right-click on blank area in sidebar → context menu appears with "新建连接" and "导入连接"
- [ ] Right-click on a connection item → existing per-connection menu appears (not the new one)
- [ ] Click "导入连接" → ImportDialog opens with two cards
- [ ] Click Navicat card → file picker opens filtered to .ncx
- [ ] Click DBeaver card → file picker opens filtered to .json
- [ ] Select a valid file → toast shows success, dialog closes, list refreshes
- [ ] Cancel file picker → dialog stays open, no error
- [ ] Select an invalid file → toast shows error, dialog stays open
- [ ] Click "取消" → dialog closes
- [ ] Click "新建连接" → ConnectionDialog opens in create mode

- [ ] **Step 10: Commit**

```bash
git add src/components/business/Sidebar/ConnectionList.tsx
git commit -m "feat: integrate ImportDialog and ConnectionContextMenu into sidebar"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run linter**

Run: `npm run lint` (or the project's lint command)
Expected: No new errors.

- [ ] **Step 3: Verify the mock mode works**

Set `VITE_USE_MOCK=true` and run the dev server. Verify that the import dialog opens and the mock returns the expected result without errors.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address review feedback for import dialog"
```
