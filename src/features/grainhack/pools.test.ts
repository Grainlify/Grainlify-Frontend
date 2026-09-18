import { describe, it, expect } from 'vitest'
import { formatPoolUSD } from './pools'

describe('formatPoolUSD', () => {
  // The bug this exists to prevent: the API returns Postgres numeric as a
  // fixed-scale string, and rendering it raw printed "$8.000000" in
  // production on both contributor-facing GrainHack pages.
  it('formats the fixed-scale decimal string the API actually returns', () => {
    expect(formatPoolUSD('8.000000')).toBe('$8.00')
    expect(formatPoolUSD('10.000000')).toBe('$10.00')
    expect(formatPoolUSD('1234.500000')).toBe('$1,234.50')
  })

  it('returns null for an absent pool rather than inventing $0.00', () => {
    expect(formatPoolUSD(null)).toBeNull()
    expect(formatPoolUSD(undefined)).toBeNull()
    expect(formatPoolUSD('')).toBeNull()
  })

  it('returns null rather than NaN for a non-numeric value', () => {
    expect(formatPoolUSD('not-a-number')).toBeNull()
  })

  // A real zero is a fact, not an absence: an event can be funded at zero and
  // that must render, unlike a pool that was never set.
  it('renders a genuine zero pool', () => {
    expect(formatPoolUSD('0.000000')).toBe('$0.00')
  })
})
