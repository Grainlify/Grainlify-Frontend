import { describe, it, expect } from 'vitest'
import { formatUsdAmount } from './usd'

describe('formatUsdAmount', () => {
  // The shapes the API actually returns. Every one of these was observed on
  // a live endpoint or found in a fixture during the audit, rather than
  // invented for the test.
  it('formats the fixed-scale strings Postgres numeric::text produces', () => {
    expect(formatUsdAmount('8.000000')).toBe('8.00')       // contributor_prize_pool
    expect(formatUsdAmount('10.000000')).toBe('10.00')     // sponsor_total_usdc
    expect(formatUsdAmount('3.000000')).toBe('3.00')       // usdc_amount, redemptions
    expect(formatUsdAmount('0.000000')).toBe('0.00')
  })

  it('accepts a differing scale, including the 2dp and 0dp shapes in existing fixtures', () => {
    expect(formatUsdAmount('5.00')).toBe('5.00')
    expect(formatUsdAmount('8')).toBe('8.00')
    expect(formatUsdAmount('0.070000')).toBe('0.07')
    expect(formatUsdAmount('1234.500000')).toBe('1,234.50')
  })

  it('groups thousands', () => {
    expect(formatUsdAmount('1000.000000')).toBe('1,000.00')
    expect(formatUsdAmount('1234567.890000')).toBe('1,234,567.89')
  })

  // Rounding happens only at the display boundary, half-up on the third
  // decimal. These pin the behaviour rather than describing it.
  it('rounds half-up at the second decimal', () => {
    expect(formatUsdAmount('0.004999')).toBe('0.00')
    expect(formatUsdAmount('0.005000')).toBe('0.01')
    expect(formatUsdAmount('1.234999')).toBe('1.23')
    expect(formatUsdAmount('1.235000')).toBe('1.24')
  })

  it('carries the rounding through every 9', () => {
    expect(formatUsdAmount('8.999000')).toBe('9.00')
    expect(formatUsdAmount('9.999000')).toBe('10.00')
    expect(formatUsdAmount('99.999000')).toBe('100.00')
    expect(formatUsdAmount('999.999999')).toBe('1,000.00')
  })

  // The reason the rule exists. This integer is not representable as an IEEE
  // double: Number('9007199254740993') is 9007199254740992. A string
  // implementation is exact, so this test fails the moment someone
  // reintroduces a parse.
  it('is exact beyond the range a double can represent', () => {
    expect(formatUsdAmount('9007199254740993.000000')).toBe('9,007,199,254,740,993.00')
    expect(formatUsdAmount('9007199254740993.005000')).toBe('9,007,199,254,740,993.01')
  })

  it('returns null for an absent amount rather than inventing 0.00', () => {
    expect(formatUsdAmount(null)).toBeNull()
    expect(formatUsdAmount(undefined)).toBeNull()
    expect(formatUsdAmount('')).toBeNull()
    expect(formatUsdAmount('   ')).toBeNull()
  })

  it('returns null for anything that is not a plain decimal', () => {
    expect(formatUsdAmount('not-a-number')).toBeNull()
    expect(formatUsdAmount('8.0.0')).toBeNull()
    expect(formatUsdAmount('1e6')).toBeNull()
    expect(formatUsdAmount('$8.00')).toBeNull()
  })

  // Not reachable from the current schema, but the formatter should not
  // silently mangle it. Callers add their own currency marker, so this
  // returns the bare signed amount.
  it('keeps a negative sign', () => {
    expect(formatUsdAmount('-3.500000')).toBe('-3.50')
  })
})
