import { useState, useRef, useEffect, useCallback } from "react";

export function useCellSelection() {
  const [selectedCell, setSelectedCellState] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [selectedRows, setSelectedRowsState] = useState<Set<number>>(new Set());
  const [rowSelectionAnchor, setRowSelectionAnchor] = useState<number | null>(
    null,
  );
  const [isRowSelecting, setIsRowSelecting] = useState(false);
  const [cellSelectionRange, setCellSelectionRange] = useState<{
    anchor: { row: number; colIndex: number };
    tip: { row: number; colIndex: number };
  } | null>(null);
  const [, setIsCellSelecting] = useState(false);
  const cellSelectionRangeRef = useRef(cellSelectionRange);
  cellSelectionRangeRef.current = cellSelectionRange;
  const selectedCellRef = useRef<{ row: number; col: string } | null>(null);
  const selectedRowsRef = useRef<Set<number>>(new Set());
  const isCellSelectingRef = useRef(false);

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useEffect(() => {
    selectedRowsRef.current = selectedRows;
  }, [selectedRows]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsRowSelecting(false);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  const setSelectedCell = useCallback(
    (value: { row: number; col: string } | null) => {
      selectedCellRef.current = value;
      setSelectedCellState(value);
    },
    [],
  );

  const setSelectedRows = useCallback((value: Set<number>) => {
    selectedRowsRef.current = value;
    setSelectedRowsState(value);
  }, []);

  const clearSelection = useCallback(() => {
    selectedCellRef.current = null;
    setSelectedCellState(null);
    const emptyRows = new Set<number>();
    selectedRowsRef.current = emptyRows;
    setSelectedRowsState(emptyRows);
    setRowSelectionAnchor(null);
    setIsRowSelecting(false);
    setCellSelectionRange(null);
    setIsCellSelecting(false);
    isCellSelectingRef.current = false;
  }, []);

  const handleCellClick = useCallback(
    (rowIndex: number, col: string) => {
      const nextSelectedRows = new Set<number>();
      selectedRowsRef.current = nextSelectedRows;
      setSelectedRowsState(nextSelectedRows);
      setRowSelectionAnchor(null);
      setIsRowSelecting(false);
      setCellSelectionRange(null);
      setIsCellSelecting(false);
      isCellSelectingRef.current = false;
      const nextSelectedCell = { row: rowIndex, col };
      selectedCellRef.current = nextSelectedCell;
      setSelectedCellState(nextSelectedCell);
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
      const nextSelectedCell = { row: rowIndex, col: columns[colIndex] };
      setSelectedCellState(nextSelectedCell);
      selectedCellRef.current = nextSelectedCell;
      const emptyRows = new Set<number>();
      setSelectedRowsState(emptyRows);
      selectedRowsRef.current = emptyRows;
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
    setSelectedRowsState(nextSelectedRows);
  }, []);

  const selectRowRange = useCallback((anchor: number, current: number) => {
    const start = Math.min(anchor, current);
    const end = Math.max(anchor, current);
    const next = new Set<number>();
    for (let i = start; i <= end; i++) {
      next.add(i);
    }
    selectedRowsRef.current = next;
    setSelectedRowsState(next);
  }, []);

  const handleIndexMouseDown = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      if (e.button !== 0) return;
      e.preventDefault();
      selectedCellRef.current = null;
      setSelectedCellState(null);
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

  return {
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
  };
}