import { describe, it, expect } from 'vitest'
import { explorerLabel, formatMinor, isUuid, networkLabel, nonClosure, payoutNetwork, releaseFailure, sendState, startState, whoseLegs } from './keeperhubModel'
import { PAYOUT_COMPUTATION, allPaid, awaiting, blocked, notConfigured, resumable, runFailed, settlementPreview } from './fixtures'

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


describe('startState', () => {
  it('offers nothing until the event is settled, and says what phase it is in', () => {
    expect(startState(undefined, undefined, null)).toEqual({ kind: 'phase_unknown' })
    expect(startState('results_published', settlementPreview(), null)).toEqual({ kind: 'not_settled', phase: 'results_published' })
  })

  it('waits for the preview, and a failed preview is not a ready one', () => {
    expect(startState('settled', undefined, null).kind).toBe('loading')
    expect(startState('settled', undefined, 'load_failed')).toEqual({ kind: 'preview_failed', code: 'load_failed' })
  })

  it('refuses nothing-to-settle, an Aptos settlement and amounts that miss the pool', () => {
    expect(startState('settled', { nothing_to_settle: true, hackathon_id: 'h', pool: 'contributor', reason: 'nothing to settle: the contributor pool is zero or unset' }, null))
      .toEqual({ kind: 'nothing_to_settle', reason: 'nothing to settle: the contributor pool is zero or unset' })
    expect(startState('settled', settlementPreview({ already_settled: true, settlement_id: 's-1' }), null))
      .toEqual({ kind: 'settled_on_aptos', settlementId: 's-1' })
    expect(startState('settled', settlementPreview({ sums_to_pool: false }), null).kind).toBe('does_not_sum')
  })

  it('is ready on a settled event whose amounts sum to the pool', () => {
    expect(startState('settled', settlementPreview(), null).kind).toBe('ready')
  })
})

describe('payout networks', () => {
  it('names testnet and mainnet with their chain ids', () => {
    expect(networkLabel(payoutNetwork('base-sepolia')!)).toBe('Base Sepolia (testnet, chain 84532)')
    expect(networkLabel(payoutNetwork('base')!)).toBe('Base (mainnet, chain 8453)')
    expect(payoutNetwork('aptos-testnet')).toBeUndefined()
  })

  it('accepts only a well-formed computation id', () => {
    expect(isUuid(PAYOUT_COMPUTATION)).toBe(true)
    expect(isUuid(` ${PAYOUT_COMPUTATION} `)).toBe(true)
    expect(isUuid('pr-1')).toBe(false)
    expect(isUuid('')).toBe(false)
  })
})

describe('releaseFailure', () => {
  it.each([
    ['payout_run_not_current', '', /isn't this event's current payout computation/],
    ['invalid_payout_run_id', '', /isn't a valid id/],
    ['run_mismatch', '', /different network or computation/],
    ['chain_not_evm', '', /isn't an enabled EVM chain/],
    ['settled_on_aptos_rail', '', /already settled on the Aptos rail/],
    ['nothing_to_settle', '', /nothing to pay/],
    ['preflight_would_revert', '', /simulation says a transfer would fail/],
    ['preflight_unavailable', '', /couldn't be reached, and nothing is sent unsimulated/],
    ['keeperhub_not_configured', '', /isn't configured on this server/],
    ['dispatch_rejected', '', /refused the request, so nothing was sent/],
    ['dispatch_outcome_unknown', '', /may have paid/],
    ['concurrent_release', '', /already in progress/],
    ['run_failed', '', /needs a person/],
    ['chain_mismatch', '', /different chain/],
    ['pool_unsupported', '', /only the contributor pool/],
  ])('%s', (code, detail, sentence) => {
    expect(releaseFailure(code, detail)).toMatch(sentence)
  })

  it('reads why the event is not releasable from the guard detail', () => {
    const msg = (d: string) => releaseFailure('payout_not_releasable', `hackathon: payout not releasable: ${d}`)
    expect(msg('this hackathon is in shadow mode, which computes payouts but pays nothing')).toMatch(/Turn judging_shadow_mode off/)
    expect(msg('the appeal window has not been closed out, so the post-appeal recompute has not run')).toMatch(/appeal window hasn't been closed out/)
    expect(msg('payouts release at Phase 6 (settled), after the appeal window closes - this hackathon is "closed"')).toBe('Nothing was sent: payouts start once the event is settled.')
    expect(msg('could not confirm the hackathon has settled: no rows')).toMatch(/once the event is settled/)
    expect(releaseFailure('payout_not_releasable', 'something new')).toBe("Nothing was sent: the event isn't ready to pay. something new")
  })

  it('says everyone was excluded when a first release has nothing to send', () => {
    expect(releaseFailure('nothing_unpaid', '', { starting: true })).toMatch(/Everyone was excluded/)
    expect(releaseFailure('nothing_unpaid', '')).toBe('Nothing was sent: every leg is already paid.')
  })

  it('keeps an unknown code and its detail visible', () => {
    expect(releaseFailure('keeperhub_payout_failed', 'legs and exclusions do not sum to the pool'))
      .toBe('Nothing was sent (keeperhub_payout_failed). legs and exclusions do not sum to the pool')
    expect(releaseFailure('', '')).toBe('Nothing was sent.')
  })
})
