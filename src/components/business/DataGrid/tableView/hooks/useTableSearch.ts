import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { collectSearchMatches } from "../utils";

export interface UseTableSearchParams {
  currentData: any[];
  columns: string[];
  editingCell: { row: number; col: string } | null;
  commitEdit: () => void;
  getCellDisplayValue: (
    rowIndex: number,
    column: string,
    originalValue: any,
  ) => any;
  setSelectedCell: (cell: { row: number; col: string } | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useTableSearch({
  currentData,
  columns,
  editingCell,
  commitEdit,
  getCellDisplayValue,
  setSelectedCell,
  containerRef,
}: UseTableSearchParams) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCursorIndex, setSearchCursorIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();

  const searchMatches = useMemo(() => {
    return collectSearchMatches(
      currentData,
      columns,
      normalizedSearchKeyword,
      getCellDisplayValue,
    );
  }, [normalizedSearchKeyword, currentData, columns, getCellDisplayValue]);

  const matchedRows = useMemo(() => {
    const rows = new Set<number>();
    searchMatches.forEach((match) => {
      rows.add(match.row);
    });
    return rows;
  }, [searchMatches]);

  const matchedCellKeys = useMemo(() => {
    const keys = new Set<string>();
    searchMatches.forEach((match) => {
      keys.add(`${match.row}::${match.col}`);
    });
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

      setSelectedCell({ row: nextMatch.row, col: nextMatch.col });
      setSearchCursorIndex(safeIndex);

      requestAnimationFrame(() => {
        const row = nextMatch.row;
        const colIndex = nextMatch.colIndex;
        const target = containerRef.current?.querySelector<HTMLElement>(
          `td[data-row-index="${row}"][data-col-index="${colIndex}"]`,
        );
        target?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      });
    },
    [searchMatches, editingCell, commitEdit, setSelectedCell, containerRef],
  );

  const handleSearchEnter = useCallback(() => {
    if (!searchMatches.length) return;
    const nextIndex = searchCursorIndex < 0 ? 0 : searchCursorIndex + 1;
    jumpToSearchMatch(nextIndex);
  }, [searchMatches, searchCursorIndex, jumpToSearchMatch]);

  // Reset cursor when keyword changes
  useEffect(() => {
    setSearchCursorIndex(-1);
  }, [normalizedSearchKeyword]);

  // Clamp cursor when matches change
  useEffect(() => {
    if (!searchMatches.length) {
      setSearchCursorIndex(-1);
      return;
    }
    if (searchCursorIndex >= searchMatches.length) {
      setSearchCursorIndex(0);
    }
  }, [searchMatches, searchCursorIndex]);

  // Focus search input when opened
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
