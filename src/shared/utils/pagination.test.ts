import { describe, it, expect } from "vitest";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MAX_OFFSET,
  clampLimit,
  clampOffset,
  hasMoreByTotal,
  hasMoreByPageSize,
} from "./pagination";

describe("clampLimit", () => {
  it("returns the requested limit when within bounds", () => {
    expect(clampLimit(25)).toBe(25);
    expect(clampLimit(1)).toBe(1);
    expect(clampLimit(MAX_PAGE_LIMIT)).toBe(MAX_PAGE_LIMIT);
  });

  it("caps oversized limits at MAX_PAGE_LIMIT (anti-abuse)", () => {
    expect(clampLimit(MAX_PAGE_LIMIT + 1)).toBe(MAX_PAGE_LIMIT);
    expect(clampLimit(1_000_000)).toBe(MAX_PAGE_LIMIT);
    expect(clampLimit(Number.MAX_SAFE_INTEGER)).toBe(MAX_PAGE_LIMIT);
  });

  it("falls back for missing / non-positive / non-finite input", () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_PAGE_LIMIT);
    expect(clampLimit(null)).toBe(DEFAULT_PAGE_LIMIT);
    expect(clampLimit(0)).toBe(DEFAULT_PAGE_LIMIT);
    expect(clampLimit(-5)).toBe(DEFAULT_PAGE_LIMIT);
    expect(clampLimit(NaN)).toBe(DEFAULT_PAGE_LIMIT);
    expect(clampLimit(Infinity)).toBe(DEFAULT_PAGE_LIMIT);
  });

  it("floors fractional values", () => {
    expect(clampLimit(10.9)).toBe(10);
  });

  it("honours a custom fallback but still clamps it to bounds", () => {
    expect(clampLimit(undefined, 5)).toBe(5);
    expect(clampLimit(0, 20)).toBe(20);
    expect(clampLimit(undefined, 0)).toBe(DEFAULT_PAGE_LIMIT);
    expect(clampLimit(undefined, MAX_PAGE_LIMIT + 50)).toBe(MAX_PAGE_LIMIT);
  });
});

describe("clampOffset", () => {
  it("returns the requested offset when within bounds", () => {
    expect(clampOffset(0)).toBe(0);
    expect(clampOffset(120)).toBe(120);
    expect(clampOffset(MAX_OFFSET)).toBe(MAX_OFFSET);
  });

  it("caps oversized offsets at MAX_OFFSET (anti-abuse)", () => {
    expect(clampOffset(MAX_OFFSET + 1)).toBe(MAX_OFFSET);
    expect(clampOffset(999_999_999)).toBe(MAX_OFFSET);
  });

  it("coerces negative / non-finite / missing input to 0", () => {
    expect(clampOffset(-1)).toBe(0);
    expect(clampOffset(-1000)).toBe(0);
    expect(clampOffset(NaN)).toBe(0);
    expect(clampOffset(Infinity)).toBe(0);
    expect(clampOffset(undefined)).toBe(0);
    expect(clampOffset(null)).toBe(0);
  });

  it("floors fractional values", () => {
    expect(clampOffset(10.7)).toBe(10);
  });
});

describe("hasMoreByTotal", () => {
  it("reports more while loaded is below total", () => {
    expect(hasMoreByTotal(10, 50)).toBe(true);
  });

  it("stops at and beyond the total (offset + loaded >= total)", () => {
    expect(hasMoreByTotal(50, 50)).toBe(false);
    expect(hasMoreByTotal(60, 50)).toBe(false);
  });

  it("returns false for empty / invalid totals", () => {
    expect(hasMoreByTotal(0, 0)).toBe(false);
    expect(hasMoreByTotal(0, -1)).toBe(false);
    expect(hasMoreByTotal(NaN, 10)).toBe(false);
    expect(hasMoreByTotal(5, NaN)).toBe(false);
  });
});

describe("hasMoreByPageSize", () => {
  it("reports more when the last page was full", () => {
    expect(hasMoreByPageSize(10, 10)).toBe(true);
  });

  it("reports no more on a short or empty page (end of list)", () => {
    expect(hasMoreByPageSize(4, 10)).toBe(false);
    expect(hasMoreByPageSize(0, 10)).toBe(false);
  });

  it("uses the clamped limit when comparing", () => {
    // An absurd limit is clamped to MAX_PAGE_LIMIT before comparison.
    expect(hasMoreByPageSize(MAX_PAGE_LIMIT, 1_000_000)).toBe(true);
  });

  it("returns false for invalid received counts", () => {
    expect(hasMoreByPageSize(NaN, 10)).toBe(false);
    expect(hasMoreByPageSize(-3, 10)).toBe(false);
  });
});
