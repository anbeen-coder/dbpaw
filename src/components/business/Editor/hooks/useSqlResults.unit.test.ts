import { mock } from "bun:test";

const mockT = (s: string, opts?: Record<string, unknown>) => {
  if (opts?.count !== undefined) return `${s} ${opts.count}`;
  return s;
};
mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

import { describe, test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useSqlResults } from "./useSqlResults";

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
});
