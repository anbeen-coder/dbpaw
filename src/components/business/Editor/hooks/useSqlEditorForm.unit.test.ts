import { describe, test, expect, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useSqlEditorForm } from "./useSqlEditorForm";

describe("useSqlEditorForm", () => {
  test("uses internal state when no value prop provided", () => {
    const { result } = renderHook(() => useSqlEditorForm({}));
    act(() => result.current.handleSqlChange("SELECT 1"));
    expect(result.current.code).toBe("SELECT 1");
  });

  test("uses controlled value when value prop provided", () => {
    const { result } = renderHook(() =>
      useSqlEditorForm({ value: "SELECT 2" }),
    );
    expect(result.current.code).toBe("SELECT 2");
  });

  test("reports controlled changes synchronously for execution provenance", () => {
    const onChange = mock(() => {});
    const { result } = renderHook(() => useSqlEditorForm({ onChange }));

    act(() => result.current.handleSqlChange("SELECT 1"));
    expect(onChange).toHaveBeenCalledWith("SELECT 1");
  });
});
