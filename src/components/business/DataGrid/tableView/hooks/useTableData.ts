import { useMemo } from "react";
import { sortRows } from "../utils";
import type { TableRow } from "../types";

interface UseTableDataParams {
  data: TableRow[];
  activeSortColumn: string | undefined;
  activeSortDirection: "asc" | "desc" | undefined;
  isControlledSort: boolean;
  total: number | null;
  page: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
}

export function useTableData({
  data,
  activeSortColumn,
  activeSortDirection,
  isControlledSort,
  total,
  page,
  pageSize,
  onPageChange,
}: UseTableDataParams) {
  const sortedData = useMemo(() => {
    if (isControlledSort || !activeSortColumn || !activeSortDirection) {
      return data;
    }
    return sortRows(data, activeSortColumn, activeSortDirection);
  }, [data, isControlledSort, activeSortColumn, activeSortDirection]);

  const currentData = useMemo(
    () =>
      onPageChange
        ? sortedData
        : sortedData.slice((page - 1) * pageSize, page * pageSize),
    [onPageChange, page, pageSize, sortedData],
  );

  const hasKnownTotal = typeof total === "number";
  const totalPages = hasKnownTotal
    ? Math.max(1, Math.ceil(total / pageSize))
    : null;
  const canGoNext = hasKnownTotal
    ? page < Math.max(1, Math.ceil(total / pageSize))
    : currentData.length >= pageSize;

  return { sortedData, currentData, hasKnownTotal, totalPages, canGoNext };
}
