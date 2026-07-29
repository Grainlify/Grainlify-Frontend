import { describe, expect, it } from 'vitest'
import { formatCountBadge } from './formatCountBadge'

describe('formatCountBadge', () => {
  // ── normal range ──────────────────────────────────────────────────────────
  it.each([
    [0, '0'],
    [1, '1'],
    [50, '50'],
    [99, '99'],
  ])('returns exact string for %i → %s', (input, expected) => {
    expect(formatCountBadge(input)).toBe(expected)
  })

  // ── overflow ──────────────────────────────────────────────────────────────
  it.each([
    [100, '99+'],
    [101, '99+'],
    [999, '99+'],
    [1_000_000, '99+'],
  ])('caps at 99+ for %i → %s', (input, expected) => {
    expect(formatCountBadge(input)).toBe(expected)
  })

  // ── fractional ────────────────────────────────────────────────────────────
  it.each([
    [3.7, '3'],
    [99.9, '99'],
    [100.1, '99+'],
  ])('truncates decimals for %i → %s', (input, expected) => {
    expect(formatCountBadge(input)).toBe(expected)
  })

  // ── negative / non-finite ─────────────────────────────────────────────────
  it.each([
    [-1, '0'],
    [-100, '0'],
    [NaN, '0'],
    [Infinity, '0'],
    [-Infinity, '0'],
  ] as const)('clamps %s to 0', (input, expected) => {
    expect(formatCountBadge(input)).toBe(expected)
  })
})