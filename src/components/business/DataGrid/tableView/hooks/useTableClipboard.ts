import {
  useCallback,
  type ClipboardEvent as ReactClipboardEvent,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import {
  buildUpdateStatement,
  cellValueToString,
  escapeSQL,
  formatSQLValue,
  getQualifiedTableName,
  quoteIdent,
} from "../utils";
import {
  buildRangeCSV,
  buildRangeInsertSQL,
  buildRangeUpdateSQL,
  buildRowsCSV as buildRowsCSVFn,
  buildRowsInsertSQL as buildRowsInsertSQLFn,
  buildRowsTSV as buildRowsTSVFn,
  buildRowsUpdateSQL as buildRowsUpdateSQLFn,
  getNormalizedCellRange as normalizeRange,
  type CellRange,
} from "../selectionCopy";
import type { PendingChange } from "./useCellEditing";
import type { SelectedCell, TableContext, TableRow } from "../types";

interface UseTableClipboardParams {
  t: TFunction;
  data: TableRow[];
  currentData: TableRow[];
  columns: string[];
  tableContext?: TableContext;
  canUpdateDelete: boolean;
  primaryKeys: string[];
  isEditableForUpdates: boolean;
  selectedCellRef: MutableRefObject<SelectedCell | null>;
  cellSelectionRange: {
    anchor: { row: number; colIndex: number };
    tip: { row: number; colIndex: number };
  } | null;
  getCellDisplayValue: (
    rowIndex: number,
    column: string,
    originalValue: unknown,
  ) => unknown;
  setPendingChanges: Dispatch<SetStateAction<Map<string, PendingChange>>>;
}

export function useTableClipboard({
  t,
  data,
  currentData,
  columns,
  tableContext,
  canUpdateDelete,
  primaryKeys,
  isEditableForUpdates,
  selectedCellRef,
  cellSelectionRange,
  getCellDisplayValue,
  setPendingChanges,
}: UseTableClipboardParams) {
  const handleCopy = useCallback(
    (text: string, label?: string) => {
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          if (label) {
            toast.success(label);
          }
        })
        .catch((error) => {
          toast.error(t("tableView.toast.copyFailed"), {
            description: error instanceof Error ? error.message : String(error),
          });
        });
    },
    [t],
  );

  const handleHeaderCopy = useCallback(
    (column: string) => {
      void navigator.clipboard
        .writeText(column)
        .then(() => {
          toast.success(
            t("tableView.toast.columnNameCopied", {
              column,
            }),
          );
        })
        .catch((error) => {
          toast.error(t("tableView.toast.copyFailed"), {
            description: error instanceof Error ? error.message : String(error),
          });
        });
    },
    [t],
  );

  const buildRowsTSV = useCallback(
    (rowIndexes: number[]) =>
      buildRowsTSVFn(
        rowIndexes,
        columns,
        currentData,
        getCellDisplayValue,
        cellValueToString,
      ),
    [columns, currentData, getCellDisplayValue],
  );

  const getSelectedCellCopyText = useCallback(() => {
    const selectedCell = selectedCellRef.current;
    if (!selectedCell) return null;
    const row = currentData[selectedCell.row];
    if (!row) return null;
    const value = getCellDisplayValue(
      selectedCell.row,
      selectedCell.col,
      row[selectedCell.col],
    );
    if (value === null || value === undefined) return "";
    return cellValueToString(value);
  }, [currentData, getCellDisplayValue, selectedCellRef]);

  const getNormalizedCellRange = useCallback((): CellRange | null => {
    if (!cellSelectionRange) return null;
    return normalizeRange(cellSelectionRange.anchor, cellSelectionRange.tip);
  }, [cellSelectionRange]);

  const handleCopySelection = useCallback(() => {
    const range = getNormalizedCellRange();
    if (!range) {
      const text = getSelectedCellCopyText();
      if (text !== null) handleCopy(text, t("tableView.toast.cellCopied"));
      return;
    }
    const lines: string[] = [];
    for (let r = range.minRow; r <= range.maxRow; r++) {
      const row = currentData[r];
      if (!row) continue;
      const cells: string[] = [];
      for (let c = range.minCol; c <= range.maxCol; c++) {
        const col = columns[c];
        const val = getCellDisplayValue(r, col, row[col]);
        cells.push(
          val === null || val === undefined ? "" : cellValueToString(val),
        );
      }
      lines.push(cells.join("\t"));
    }
    const rowCount = range.maxRow - range.minRow + 1;
    const colCount = range.maxCol - range.minCol + 1;
    handleCopy(
      lines.join("\n"),
      t("tableView.toast.cellsCopied", { rows: rowCount, columns: colCount }),
    );
  }, [
    getNormalizedCellRange,
    getSelectedCellCopyText,
    currentData,
    columns,
    getCellDisplayValue,
    handleCopy,
    t,
  ]);

  const buildSelectionCSV = useCallback(() => {
    const range = getNormalizedCellRange();
    if (!range) return "";
    return buildRangeCSV(
      range,
      columns,
      currentData,
      getCellDisplayValue,
      cellValueToString,
    );
  }, [getNormalizedCellRange, currentData, columns, getCellDisplayValue]);

  const buildSelectionInsertSQL = useCallback(() => {
    const range = getNormalizedCellRange();
    if (!range || !tableContext) return "";
    const { schema, table, driver } = tableContext;
    const tableName = getQualifiedTableName(driver, schema, table);
    return buildRangeInsertSQL(
      range,
      columns,
      currentData,
      getCellDisplayValue,
      formatSQLValue,
      quoteIdent,
      driver,
      tableName,
    );
  }, [
    getNormalizedCellRange,
    currentData,
    columns,
    getCellDisplayValue,
    tableContext,
  ]);

  const buildSelectionUpdateSQL = useCallback(() => {
    const range = getNormalizedCellRange();
    if (!range || !tableContext || !canUpdateDelete || primaryKeys.length === 0)
      return "";
    const { schema, table, driver } = tableContext;
    const tableName = getQualifiedTableName(driver, schema, table);
    return buildRangeUpdateSQL(
      range,
      columns,
      currentData,
      primaryKeys,
      getCellDisplayValue,
      formatSQLValue,
      quoteIdent,
      escapeSQL,
      buildUpdateStatement,
      driver,
      tableName,
    );
  }, [
    getNormalizedCellRange,
    currentData,
    columns,
    getCellDisplayValue,
    canUpdateDelete,
    primaryKeys,
    tableContext,
  ]);

  const handlePaste = useCallback(
    (e: ReactClipboardEvent) => {
      if (!isEditableForUpdates) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      e.preventDefault();

      const baseCell = selectedCellRef.current;
      if (!baseCell) return;
      const baseColIndex = columns.indexOf(baseCell.col);
      if (baseColIndex < 0) return;

      const rows = text.split("\n");
      const newChanges = new Map<string, PendingChange>();

      for (let dr = 0; dr < rows.length; dr++) {
        const line = rows[dr];
        if (line === "" && dr === rows.length - 1) break;
        const cells = line.split("\t");
        const targetRow = baseCell.row + dr;
        if (targetRow >= currentData.length) break;
        const originalRow = currentData[targetRow];
        if (!originalRow) continue;
        const sourceRowIndex = data.indexOf(originalRow);

        for (let dc = 0; dc < cells.length; dc++) {
          const targetColIdx = baseColIndex + dc;
          if (targetColIdx >= columns.length) break;
          const col = columns[targetColIdx];
          const newValue = cells[dc];
          const originalValue = originalRow[col];
          const originalStr = cellValueToString(originalValue);

          if (newValue !== originalStr) {
            const key = `${targetRow}_${col}`;
            newChanges.set(key, {
              rowIndex: targetRow,
              sourceRowIndex: sourceRowIndex >= 0 ? sourceRowIndex : targetRow,
              column: col,
              originalValue,
              newValue,
            });
          }
        }
      }

      if (newChanges.size > 0) {
        setPendingChanges((prev) => {
          const next = new Map(prev);
          newChanges.forEach((v, k) => next.set(k, v));
          return next;
        });
        toast.success(
          t("tableView.toast.cellsPasted", { count: newChanges.size }),
        );
      }
    },
    [
      isEditableForUpdates,
      selectedCellRef,
      columns,
      currentData,
      data,
      setPendingChanges,
      t,
    ],
  );

  const buildRowsCSV = useCallback(
    (rowIndexes: number[]) =>
      buildRowsCSVFn(
        rowIndexes,
        columns,
        currentData,
        getCellDisplayValue,
        cellValueToString,
      ),
    [columns, currentData, getCellDisplayValue],
  );

  const buildRowsInsertSQL = useCallback(
    (rowIndexes: number[]) => {
      if (!tableContext) return "";
      const { schema, table, driver } = tableContext;
      const tableName = getQualifiedTableName(driver, schema, table);
      return buildRowsInsertSQLFn(
        rowIndexes,
        columns,
        currentData,
        getCellDisplayValue,
        formatSQLValue,
        quoteIdent,
        driver,
        tableName,
      );
    },
    [columns, currentData, getCellDisplayValue, tableContext],
  );

  const buildRowsUpdateSQL = useCallback(
    (rowIndexes: number[]) => {
      if (!tableContext || !canUpdateDelete || primaryKeys.length === 0)
        return "";
      const { schema, table, driver } = tableContext;
      const tableName = getQualifiedTableName(driver, schema, table);
      return buildRowsUpdateSQLFn(
        rowIndexes,
        columns,
        currentData,
        primaryKeys,
        getCellDisplayValue,
        formatSQLValue,
        quoteIdent,
        escapeSQL,
        buildUpdateStatement,
        driver,
        tableName,
      );
    },
    [
      columns,
      currentData,
      getCellDisplayValue,
      canUpdateDelete,
      primaryKeys,
      tableContext,
    ],
  );

  return {
    handleCopy,
    handleHeaderCopy,
    buildRowsTSV,
    getSelectedCellCopyText,
    getNormalizedCellRange,
    handleCopySelection,
    buildSelectionCSV,
    buildSelectionInsertSQL,
    buildSelectionUpdateSQL,
    handlePaste,
    buildRowsCSV,
    buildRowsInsertSQL,
    buildRowsUpdateSQL,
  };
}
