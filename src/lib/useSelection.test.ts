/**
 * P3-4 — the shared selection primitive. One place to own "which rows are picked"
 * across Talent, results, and (later) the pipeline roster, so a bulk action bar
 * and keyboard triage read the same state instead of each surface rolling its own
 * Set. Pure over a Set of ids; the bar and checkboxes are thin views on top.
 */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelection } from "./useSelection";

describe("useSelection", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.count).toBe(0);
    expect(result.current.isSelected("a")).toBe(false);
  });

  it("toggles an id on and off", () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggle("a"));
    expect(result.current.isSelected("a")).toBe(true);
    expect(result.current.count).toBe(1);
    act(() => result.current.toggle("a"));
    expect(result.current.isSelected("a")).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it("tracks several ids and exposes them in insertion order", () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    expect(result.current.ids).toEqual(["a", "b"]);
    expect(result.current.count).toBe(2);
  });

  it("clears everything", () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
    expect(result.current.ids).toEqual([]);
  });

  it("replaces the selection wholesale via set", () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggle("a"));
    act(() => result.current.set(["x", "y", "z"]));
    expect(result.current.ids).toEqual(["x", "y", "z"]);
    expect(result.current.isSelected("a")).toBe(false);
  });
});
