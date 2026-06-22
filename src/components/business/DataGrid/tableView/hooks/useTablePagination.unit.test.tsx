import "../../../../../../test-setup";
import { describe, expect, test } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { useTablePagination } from "./useTablePagination";

function PaginationProbe({
  totalPages,
  canGoNext,
  onPageChange,
}: {
  totalPages: number | null;
  canGoNext: boolean;
  onPageChange: (page: number) => void;
}) {
  const pagination = useTablePagination({
    page: 1,
    pageSize: 2,
    totalPages,
    canGoNext,
    onPageChange,
  });

  return (
    <button type="button" onClick={pagination.handleNextPage}>
      next
    </button>
  );
}

describe("useTablePagination", () => {
  test("allows next page when total is unknown and current page looks full", () => {
    const calls: number[] = [];
    const { container } = render(
      <PaginationProbe
        totalPages={null}
        canGoNext={true}
        onPageChange={(page) => calls.push(page)}
      />,
    );

    fireEvent.click(container.firstElementChild as HTMLElement);

    expect(calls).toEqual([2]);
  });

  test("blocks next page when total is unknown and current page is not full", () => {
    const calls: number[] = [];
    const { container } = render(
      <PaginationProbe
        totalPages={null}
        canGoNext={false}
        onPageChange={(page) => calls.push(page)}
      />,
    );

    fireEvent.click(container.firstElementChild as HTMLElement);

    expect(calls).toEqual([]);
  });
});
