import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, mock, beforeEach } from "bun:test";
import { useZSetRankScore } from "../useZSetRankScore";

const mockOnZRank = mock(() => {});
const mockOnZScore = mock(() => {});
const mockOnZMScore = mock(() => {});

describe("useZSetRankScore", () => {
  beforeEach(() => {
    mockOnZRank.mockClear();
    mockOnZScore.mockClear();
    mockOnZMScore.mockClear();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useZSetRankScore(mockOnZRank, mockOnZScore, mockOnZMScore),
    );
    expect(result.current.rankMember).toBe("");
    expect(result.current.rankResult).toBeNull();
    expect(result.current.isRanking).toBe(false);
    expect(result.current.scoreMember).toBe("");
    expect(result.current.scoreResult).toBeNull();
    expect(result.current.isScoring).toBe(false);
  });

  it("should execute rank lookup and update state", async () => {
    mockOnZRank.mockResolvedValue(5);
    const { result } = renderHook(() =>
      useZSetRankScore(mockOnZRank, mockOnZScore, mockOnZMScore),
    );
    act(() => {
      result.current.setRankMember("a");
    });
    await act(async () => {
      await result.current.handleRankLookup(false);
    });
    expect(mockOnZRank).toHaveBeenCalledWith("a", false);
    expect(result.current.rankResult).toEqual({ rank: 5, reverse: false });
    expect(result.current.isRanking).toBe(false);
  });

  it("should handle reverse rank lookup", async () => {
    mockOnZRank.mockResolvedValue(3);
    const { result } = renderHook(() =>
      useZSetRankScore(mockOnZRank, mockOnZScore, mockOnZMScore),
    );
    act(() => {
      result.current.setRankMember("a");
    });
    await act(async () => {
      await result.current.handleRankLookup(true);
    });
    expect(mockOnZRank).toHaveBeenCalledWith("a", true);
    expect(result.current.rankResult).toEqual({ rank: 3, reverse: true });
  });

  it("should handle null rank result", async () => {
    mockOnZRank.mockResolvedValue(null);
    const { result } = renderHook(() =>
      useZSetRankScore(mockOnZRank, mockOnZScore, mockOnZMScore),
    );
    act(() => {
      result.current.setRankMember("nonexistent");
    });
    await act(async () => {
      await result.current.handleRankLookup(false);
    });
    expect(result.current.rankResult).toBeNull();
  });

  it("should execute single score lookup", async () => {
    mockOnZScore.mockResolvedValue(42);
    const { result } = renderHook(() =>
      useZSetRankScore(mockOnZRank, mockOnZScore, mockOnZMScore),
    );
    act(() => {
      result.current.setScoreMember("a");
    });
    await act(async () => {
      await result.current.handleScoreLookup(false);
    });
    expect(mockOnZScore).toHaveBeenCalledWith("a");
    expect(result.current.scoreResult).toEqual({
      value: [42],
      members: ["a"],
    });
  });

  it("should execute multi score lookup", async () => {
    mockOnZMScore.mockResolvedValue([10, 20, null]);
    const { result } = renderHook(() =>
      useZSetRankScore(mockOnZRank, mockOnZScore, mockOnZMScore),
    );
    act(() => {
      result.current.setScoreMember("a, b, c");
    });
    await act(async () => {
      await result.current.handleScoreLookup(true);
    });
    expect(mockOnZMScore).toHaveBeenCalledWith(["a", "b", "c"]);
    expect(result.current.scoreResult).toEqual({
      value: [10, 20, null],
      members: ["a", "b", "c"],
    });
  });

  it("should not execute if member is empty", async () => {
    const { result } = renderHook(() =>
      useZSetRankScore(mockOnZRank, mockOnZScore, mockOnZMScore),
    );
    await act(async () => {
      await result.current.handleRankLookup(false);
    });
    expect(mockOnZRank).not.toHaveBeenCalled();
  });
});
