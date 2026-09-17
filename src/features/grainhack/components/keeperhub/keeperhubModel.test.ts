import { describe, it, expect } from 'vitest'
import { explorerLabel, formatMinor, nonClosure, sendState, whoseLegs } from './keeperhubModel'
import { allPaid, awaiting, blocked, notConfigured, resumable, runFailed } from './fixtures'

describe('formatMinor', () => {
  it('places the decimal point without rounding', () => {
    expect(formatMinor('1000001', 6, 'USDC')).toBe('1.000001 USDC')
    expect(formatMinor('2000000', 6, 'USDC')).toBe('2.000000 USDC')
    expect(formatMinor('1', 6, 'USDC')).toBe('0.000001 USDC')
    expect(formatMinor('123456789012345678901234567890', 6, null)).toBe('123456789012345678901234.567890')
    expect(formatMinor('0', 6, 'USDC')).toBe('0 USDC')
  })

  // A chain row without decimals is not guessed at.
  it('says "minor units" when the chain has no decimals', () => {
    expect(formatMinor('2000000', null, 'USDC')).toBe('2000000 minor units')
  })
})

describe('nonClosure', () => {
  it('is absent when every leg has a known or unsent outcome', () => {
    expect(nonClosure(resumable())).toBeNull()
    expect(nonClosure(allPaid())).toBeNull()
  })

  it('names the unknown money, the excluded money and whose leg settles it', () => {
    const g = nonClosure(blocked())!
    expect(g.unknownMinor).toBe('2000000')
    expect(g.excludedMinor).toBe('250000')
    expect(whoseLegs(g.unknownLegs)).toBe("@sample-b's leg")
  })

  it('counts a dispatched leg as not closing either', () => {
    expect(nonClosure(awaiting())!.dispatchedMinor).toBe('2000000')
  })
})

describe('sendState', () => {
  it.each([
    [resumable, 'allowed'],
    [blocked, 'may_have_paid'],
    [awaiting, 'awaiting_result'],
    [notConfigured, 'not_configured'],
    [runFailed, 'run_failed'],
    [allPaid, 'nothing_unpaid'],
  ] as const)('%o -> %s', (make, kind) => {
    expect(sendState(make()).kind).toBe(kind)
  })

  it('keeps an unexpected reason visible instead of guessing', () => {
    const v = resumable()
    v.resume = { ...v.resume, allowed: false, reason: 'payout_run_not_current' }
    expect(sendState(v)).toEqual({ kind: 'other', reason: 'payout_run_not_current' })
  })
})

describe('whoseLegs / explorerLabel', () => {
  it('falls back to a count when a login is missing', () => {
    const legs = notConfigured().legs.filter((l) => l.id === 'c')
    expect(whoseLegs(legs)).toBe('1 leg')
  })

  it('labels Basescan, including Sepolia', () => {
    expect(explorerLabel('https://sepolia.basescan.org/tx/0x1')).toBe('Basescan')
    expect(explorerLabel('https://basescan.org/tx/0x1')).toBe('Basescan')
    expect(explorerLabel('https://explorer.example/tx/0x1')).toBe('explorer.example')
  })
})
