import { useCallback } from "react";
import { buildFilterExpression } from "../utils";
import type { TableRow } from "../types";

interface UseTableFilterParams {
  selectedCell: { row: number; col: string } | null;
  currentData: TableRow[];
  tableColumns: Array<{ name: string; type: string }>;
  tableContext: { driver: string } | undefined;
  orderByInput: string;
  onFilterChange?: (filter: string, orderBy: string) => void;
  setWhereInput: (val: string) => void;
}

export function useTableFilter({
  selectedCell,
  currentData,
  tableColumns,
  tableContext,
  orderByInput,
  onFilterChange,
  setWhereInput,
}: UseTableFilterParams) {
  const applyFilter = useCallback(
    (operator: string) => {
      if (!selectedCell || !tableContext || !onFilterChange) return;

      const cellValue = currentData[selectedCell.row]?.[selectedCell.col];
      const colMeta = tableColumns.find((c) => c.name === selectedCell.col);
      const columnType = colMeta?.type || "";

      const expression = buildFilterExpression(
        tableContext.driver,
        selectedCell.col,
        operator,
        cellValue,
        columnType,
      );

      setWhereInput(expression);
      onFilterChange(expression, orderByInput);
    },
    [
      selectedCell,
      currentData,
      tableColumns,
      tableContext,
      orderByInput,
      onFilterChange,
      setWhereInput,
    ],
  );

  return { applyFilter };
}
