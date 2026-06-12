import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, mock, beforeEach } from "bun:test";
import { useZSetRangeQuery } from "../useZSetRangeQuery";

const mockOnZRangeByScore = mock(() => {});

describe("useZSetRangeQuery", () => {
  beforeEach(() => {
    mockOnZRangeByScore.mockClear();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useZSetRangeQuery(mockOnZRangeByScore));
    expect(result.current.filterMin).toBe("-inf");
    expect(result.current.filterMax).toBe("+inf");
    expect(result.current.filterActive).toBe(false);
    expect(result.current.filteredMembers).toBeNull();
    expect(result.current.filterTotal).toBeNull();
    expect(result.current.isFiltering).toBe(false);
  });

  it("should execute filter and update state", async () => {
    mockOnZRangeByScore.mockResolvedValue({
      members: [{ member: "a", score: 5 }],
      total: 1,
    });
    const { result } = renderHook(() => useZSetRangeQuery(mockOnZRangeByScore));
    act(() => {
      result.current.setFilterMin("0");
      result.current.setFilterMax("10");
    });
    await act(async () => {
      await result.current.handleFilter();
    });
    expect(mockOnZRangeByScore).toHaveBeenCalledWith("0", "10");
    expect(result.current.filteredMembers).toEqual([
      { member: "a", score: 5 },
    ]);
    expect(result.current.filterTotal).toBe(1);
    expect(result.current.filterActive).toBe(true);
    expect(result.current.isFiltering).toBe(false);
  });

  it("should clear filter and reset state", () => {
    const { result } = renderHook(() => useZSetRangeQuery(mockOnZRangeByScore));
    act(() => {
      result.current.setFilterActive(true);
      result.current.setFilteredMembers([{ member: "a", score: 5 }]);
      result.current.setFilterTotal(1);
    });
    act(() => {
      result.current.clearFilter();
    });
    expect(result.current.filterActive).toBe(false);
    expect(result.current.filteredMembers).toBeNull();
    expect(result.current.filterTotal).toBeNull();
  });

  it("should handle error gracefully", async () => {
    mockOnZRangeByScore.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useZSetRangeQuery(mockOnZRangeByScore));
    await act(async () => {
      await result.current.handleFilter();
    });
    expect(result.current.isFiltering).toBe(false);
    expect(result.current.filterActive).toBe(false);
  });
});
