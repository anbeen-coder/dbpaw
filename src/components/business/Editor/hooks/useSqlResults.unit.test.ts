import { mock } from "bun:test";

const mockT = (s: string, opts?: Record<string, unknown>) => {
  if (opts?.count !== undefined) return `${s} ${opts.count}`;
  return s;
};
mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

import { describe, test, expect } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useSqlResults } from "./useSqlResults";

const makeResultSet = (index: number) => ({
  data: [{ value: index + 1 }],
  columns: ["value"],
  rowCount: 1,
  statement: `SELECT ${index + 1}`,
  index,
});

const makeMultipleResults = () => ({
  data: [{ value: 1 }],
  columns: ["value"],
  resultSets: [makeResultSet(0), makeResultSet(1), makeResultSet(2)],
});

describe("useSqlResults", () => {
  test("returns null resultStatus when no queryResults", () => {
    const { result } = renderHook(() => useSqlResults({}));
    expect(result.current.resultStatus).toBeNull();
  });

  test("returns error status when queryResults.error exists", () => {
    const { result } = renderHook(() =>
      useSqlResults({
        queryResults: { data: [], columns: [], error: "syntax error" },
      }),
    );
    expect(result.current.resultStatus).not.toBeNull();
    expect(result.current.resultStatus!.toneClass).toBe("text-destructive");
  });

  test("returns success status with row count for single result set", () => {
    const { result } = renderHook(() =>
      useSqlResults({
        queryResults: { data: [{ id: 1 }, { id: 2 }], columns: ["id"] },
      }),
    );
    expect(result.current.resultStatus).not.toBeNull();
    expect(result.current.resultStatus!.toneClass).toContain("emerald");
  });

  test("displayData uses queryResults.data for single result", () => {
    const data = [{ id: 1 }];
    const { result } = renderHook(() =>
      useSqlResults({
        queryResults: { data, columns: ["id"] },
      }),
    );
    expect(result.current.displayData).toBe(data);
    expect(result.current.displayColumns).toEqual(["id"]);
  });

  test("hasMultipleResults is false for single result set", () => {
    const { result } = renderHook(() =>
      useSqlResults({
        queryResults: { data: [], columns: [] },
      }),
    );
    expect(result.current.hasMultipleResults).toBe(false);
  });

  test("activeResultSetIndex defaults to 0", () => {
    const { result } = renderHook(() => useSqlResults({}));
    expect(result.current.activeResultSetIndex).toBe(0);
  });

  test("closing an inactive result keeps the active result", () => {
    const queryResults = makeMultipleResults();
    const { result } = renderHook(() => useSqlResults({ queryResults }));

    act(() => result.current.setActiveResultSetIndex(1));
    act(() => result.current.closeResultSet(0));

    expect(result.current.activeResultSetIndex).toBe(1);
    expect(
      result.current.visibleResultSets.map((item) => item.originalIndex),
    ).toEqual([1, 2]);
  });

  test("closing the active result selects the result on its right", () => {
    const queryResults = makeMultipleResults();
    const { result } = renderHook(() => useSqlResults({ queryResults }));

    act(() => result.current.closeResultSet(0));

    expect(result.current.activeResultSetIndex).toBe(1);
    expect(result.current.displayData).toEqual([{ value: 2 }]);
  });

  test("closing the last active result selects the result on its left", () => {
    const queryResults = makeMultipleResults();
    const { result } = renderHook(() => useSqlResults({ queryResults }));

    act(() => result.current.setActiveResultSetIndex(2));
    act(() => result.current.closeResultSet(2));

    expect(result.current.activeResultSetIndex).toBe(1);
    expect(result.current.displayData).toEqual([{ value: 2 }]);
  });

  test("all results can be closed", () => {
    const queryResults = makeMultipleResults();
    const { result } = renderHook(() => useSqlResults({ queryResults }));

    act(() => result.current.closeResultSet(0));
    act(() => result.current.closeResultSet(1));
    act(() => result.current.closeResultSet(2));

    expect(result.current.visibleResultSets).toHaveLength(0);
    expect(result.current.hasVisibleResults).toBe(false);
  });

  test("new query results restore all result tabs", () => {
    const firstQueryResults = makeMultipleResults();
    const secondQueryResults = makeMultipleResults();
    const { result, rerender } = renderHook(
      ({ queryResults }) => useSqlResults({ queryResults }),
      { initialProps: { queryResults: firstQueryResults } },
    );

    act(() => result.current.closeResultSet(0));
    act(() => result.current.closeResultSet(1));
    act(() => result.current.closeResultSet(2));
    expect(result.current.hasVisibleResults).toBe(false);

    rerender({ queryResults: secondQueryResults });

    expect(result.current.visibleResultSets).toHaveLength(3);
    expect(result.current.activeResultSetIndex).toBe(0);
    expect(result.current.hasVisibleResults).toBe(true);
  });
});
