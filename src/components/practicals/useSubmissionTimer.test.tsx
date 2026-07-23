import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, render, screen } from "@testing-library/react";
import { useSubmissionTimer } from "./useSubmissionTimer";
import { CountdownBadge } from "./CountdownBadge";

describe("useSubmissionTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("counts down and fires onExpire exactly once at zero", () => {
    vi.setSystemTime(0);
    const onExpire = vi.fn();
    const { result } = renderHook(() => useSubmissionTimer(3000, onExpire));
    expect(result.current).toBe(3000);
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current).toBe(2000);
    act(() => void vi.advanceTimersByTime(3000));
    expect(result.current).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(5000));
    expect(onExpire).toHaveBeenCalledTimes(1); // never fires twice
  });

  it("never expires with a null deadline", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useSubmissionTimer(null, onExpire));
    expect(result.current).toBeNull();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(onExpire).not.toHaveBeenCalled();
  });
});

describe("CountdownBadge", () => {
  it("renders mm:ss and warns under 2 minutes", () => {
    const { rerender } = render(<CountdownBadge remainingMs={125_000} />); // 02:05
    expect(screen.getByText("02:05")).toBeInTheDocument();
    rerender(<CountdownBadge remainingMs={90_000} />); // 01:30, warning
    const badge = screen.getByText("01:30");
    expect(badge.className).toContain("text-danger");
  });

  it("renders nothing when there is no deadline", () => {
    const { container } = render(<CountdownBadge remainingMs={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
