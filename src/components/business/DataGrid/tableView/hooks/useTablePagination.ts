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
    PAGE_SIZE_OPTIONS,
  };
}
