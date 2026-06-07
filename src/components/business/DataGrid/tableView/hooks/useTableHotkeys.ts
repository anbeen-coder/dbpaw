import { useEffect, type MutableRefObject, type RefObject } from "react";
import { useShortcutMatcher } from "@/contexts/ShortcutsContext";
import { isEditableTarget } from "@/lib/keyboard";

interface UseTableHotkeysParams {
  containerRef: RefObject<HTMLDivElement | null>;
  editingCell: { row: number; col: string } | null;
  hasPendingChanges: boolean;
  isSaving: boolean;
  saveButtonRef: RefObject<HTMLButtonElement | null>;
  setIsSearchOpen: (open: boolean) => void;
  focusSearchInput: () => void;
  selectedRowsRef: MutableRefObject<Set<number>>;
  cellSelectionRangeRef: MutableRefObject<{
    anchor: { row: number; colIndex: number };
    tip: { row: number; colIndex: number };
  } | null>;
  buildRowsTSV: (rowIndexes: number[]) => string;
  getSelectedCellCopyText: () => string | null;
  handleCopy: (text: string, label?: string) => void;
  handleCopySelection: () => void;
  cancelEdit: () => void;
  handleDiscardChanges: () => void;
}

export function useTableHotkeys({
  containerRef,
  editingCell,
  hasPendingChanges,
  isSaving,
  saveButtonRef,
  setIsSearchOpen,
  focusSearchInput,
  selectedRowsRef,
  cellSelectionRangeRef,
  buildRowsTSV,
  getSelectedCellCopyText,
  handleCopy,
  handleCopySelection,
  cancelEdit,
  handleDiscardChanges,
}: UseTableHotkeysParams) {
  const match = useShortcutMatcher();

  useEffect(() => {
    const handleTableHotkeys = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const eventTarget = e.target instanceof Node ? e.target : null;
      const eventInsideTable = eventTarget
        ? container.contains(eventTarget)
        : false;

      const shouldHandleSave =
        eventInsideTable || !!editingCell || hasPendingChanges;

      if (match(e, "table.save")) {
        if (!shouldHandleSave) return;
        e.preventDefault();
        if (hasPendingChanges && !isSaving) {
          saveButtonRef.current?.click();
        }
        return;
      }

      if (match(e, "table.openSearch")) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        setIsSearchOpen(true);
        focusSearchInput();
        return;
      }

      if (match(e, "table.copySelection")) {
        if (isEditableTarget(e.target)) {
          return;
        }
        const selectedRows = selectedRowsRef.current;
        if (selectedRows.size) {
          e.preventDefault();
          const tsv = buildRowsTSV(Array.from(selectedRows));
          if (tsv) {
            handleCopy(tsv);
          }
          return;
        }
        const range = cellSelectionRangeRef.current;
        if (range) {
          e.preventDefault();
          handleCopySelection();
          return;
        }
        const selectedCellText = getSelectedCellCopyText();
        if (selectedCellText !== null) {
          e.preventDefault();
          handleCopy(selectedCellText);
        }
        return;
      }

      const shouldHandleEscape =
        eventInsideTable || !!editingCell || hasPendingChanges;

      if (match(e, "table.cancelEdit")) {
        if (!shouldHandleEscape) return;

        if (editingCell) {
          e.preventDefault();
          cancelEdit();
          return;
        }

        if (hasPendingChanges && !isEditableTarget(e.target)) {
          e.preventDefault();
          handleDiscardChanges();
        }
      }
    };

    window.addEventListener("keydown", handleTableHotkeys, true);
    return () => {
      window.removeEventListener("keydown", handleTableHotkeys, true);
    };
  }, [
    containerRef,
    editingCell,
    hasPendingChanges,
    isSaving,
    saveButtonRef,
    setIsSearchOpen,
    focusSearchInput,
    selectedRowsRef,
    cellSelectionRangeRef,
    buildRowsTSV,
    getSelectedCellCopyText,
    handleCopy,
    handleCopySelection,
    cancelEdit,
    handleDiscardChanges,
    match,
  ]);
}
