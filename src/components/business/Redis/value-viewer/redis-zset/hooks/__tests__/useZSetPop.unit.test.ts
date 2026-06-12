import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, mock, beforeEach } from "bun:test";
import { useZSetPop } from "../useZSetPop";

const mockOnZPopMin = mock(() => {});
const mockOnZPopMax = mock(() => {});

describe("useZSetPop", () => {
  beforeEach(() => {
    mockOnZPopMin.mockClear();
    mockOnZPopMax.mockClear();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useZSetPop(mockOnZPopMin, mockOnZPopMax));
    expect(result.current.popDialog).toBeNull();
    expect(result.current.isPopping).toBe(false);
  });

  it("should open pop dialog for min", () => {
    const { result } = renderHook(() => useZSetPop(mockOnZPopMin, mockOnZPopMax));
    act(() => {
      result.current.openPopDialog("min");
    });
    expect(result.current.popDialog).toEqual({ type: "min" });
  });

  it("should open pop dialog for max", () => {
    const { result } = renderHook(() => useZSetPop(mockOnZPopMin, mockOnZPopMax));
    act(() => {
      result.current.openPopDialog("max");
    });
    expect(result.current.popDialog).toEqual({ type: "max" });
  });

  it("should close pop dialog", () => {
    const { result } = renderHook(() => useZSetPop(mockOnZPopMin, mockOnZPopMax));
    act(() => {
      result.current.openPopDialog("min");
    });
    act(() => {
      result.current.closePopDialog();
    });
    expect(result.current.popDialog).toBeNull();
  });

  it("should execute pop min and close dialog", async () => {
    mockOnZPopMin.mockResolvedValue(undefined);
    const { result } = renderHook(() => useZSetPop(mockOnZPopMin, mockOnZPopMax));
    act(() => {
      result.current.openPopDialog("min");
    });
    await act(async () => {
      await result.current.handlePop();
    });
    expect(mockOnZPopMin).toHaveBeenCalled();
    expect(result.current.popDialog).toBeNull();
    expect(result.current.isPopping).toBe(false);
  });

  it("should execute pop max and close dialog", async () => {
    mockOnZPopMax.mockResolvedValue(undefined);
    const { result } = renderHook(() => useZSetPop(mockOnZPopMin, mockOnZPopMax));
    act(() => {
      result.current.openPopDialog("max");
    });
    await act(async () => {
      await result.current.handlePop();
    });
    expect(mockOnZPopMax).toHaveBeenCalled();
    expect(result.current.popDialog).toBeNull();
  });

  it("should not execute if no dialog is open", async () => {
    const { result } = renderHook(() => useZSetPop(mockOnZPopMin, mockOnZPopMax));
    await act(async () => {
      await result.current.handlePop();
    });
    expect(mockOnZPopMin).not.toHaveBeenCalled();
    expect(mockOnZPopMax).not.toHaveBeenCalled();
  });
});
