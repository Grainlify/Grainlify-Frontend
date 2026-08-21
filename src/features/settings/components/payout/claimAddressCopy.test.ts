import { describe, it, expect } from 'vitest'
import { describeClaimAddress, describeClaimFailure, shortAddress } from './claimAddressCopy'

const FROZEN = '0x1b41aaaabbbbccccddddeeeeffff000011112222333344445555666677778899'
const LIVE = '0xb33bffffeeeeddddccccbbbbaaaa999988887777666655554444333322114022'

describe('describeClaimAddress', () => {
  it('names the frozen address and the registration date when superseded', () => {
    const c = describeClaimAddress({
      kind: 'superseded',
      address: FROZEN,
      registeredAt: '2026-07-03T09:15:00Z',
      currentAddress: LIVE,
    })
    const all = c.paragraphs.join(' ')

    expect(all).toContain(shortAddress(FROZEN))
    expect(all).toContain('3 July 2026')
    // The three facts the person needs, each asserted separately so dropping
    // one is a named failure rather than a diff in a blob of prose.
    expect(all).toMatch(/locked to that address/i)
    expect(all).toMatch(/cannot be moved/i)
    expect(all).toContain(shortAddress(LIVE))
    expect(c.remedy).toBeTruthy()
  })

  // The date field is still landing. Absent, the sentence must degrade rather
  // than print a placeholder - a wrong date is worse than no date, because the
  // date is how somebody works out which wallet this was.
  it('omits the date rather than faking one when it is not there', () => {
    const c = describeClaimAddress({
      kind: 'superseded', address: FROZEN, registeredAt: null, currentAddress: LIVE,
    })
    const all = c.paragraphs.join(' ')

    expect(all).toContain(shortAddress(FROZEN))
    expect(all).not.toMatch(/null|undefined|Invalid Date|NaN/)
    expect(all).toContain('an address you registered previously')
  })

  it('survives an unparseable date without rendering one', () => {
    const c = describeClaimAddress({
      kind: 'superseded', address: FROZEN, registeredAt: 'not-a-date', currentAddress: LIVE,
    })
    expect(c.paragraphs.join(' ')).not.toMatch(/Invalid Date|NaN/)
  })

  // The case the scope doc's two-row table does not describe. The important
  // sentence is the one that stops somebody "fixing" it by registering a new
  // address, which does nothing for a payout already frozen.
  it('tells a user with no live address that registering one will not redirect this payout', () => {
    const c = describeClaimAddress({
      kind: 'no_live_address', address: FROZEN, registeredAt: '2026-07-03T09:15:00Z',
    })
    const all = c.paragraphs.join(' ')

    expect(all).toContain(shortAddress(FROZEN))
    expect(all).toMatch(/will not redirect this payout/i)
    expect(all).not.toContain(shortAddress(LIVE))
    expect(c.remedy).toBeTruthy()
  })

  // Never end on the bad news. Both superseded cases must carry a route out, in
  // a field a renderer cannot drop by rendering only the paragraphs.
  it.each(['superseded', 'no_live_address'] as const)(
    '%s carries a remedy that says the reward is not lost', (kind) => {
      const c = describeClaimAddress(
        kind === 'superseded'
          ? { kind, address: FROZEN, registeredAt: null, currentAddress: LIVE }
          : { kind, address: FROZEN, registeredAt: null },
      )
      expect(c.remedy).toMatch(/contact us/i)
      expect(c.remedy).toMatch(/not lost/i)
      expect(c.remedy).toMatch(/extend the claim window/i)
      expect(c.paragraphs.join(' ')).toMatch(/still have that wallet/i)
    },
  )

  it('says nothing alarming when the frozen address is the current one', () => {
    const c = describeClaimAddress({ kind: 'current', address: FROZEN })
    expect(c.tone).toBe('neutral')
    expect(c.remedy).toBeNull()
    expect(c.paragraphs.join(' ')).not.toMatch(/locked|cannot be moved|contact us/i)
  })
})

describe('describeClaimFailure', () => {
  // The state the person did nothing to cause: two accounts holding one
  // address, which the live-address unique index does not currently prevent.
  // Rendering it as a generic failure would tell somebody their payout is
  // broken when what is broken is our data.
  it('does not blame the contributor for a duplicate claim, and says the money is still theirs', () => {
    const c = describeClaimFailure({ kind: 'multiple_claims', settlementId: 's1', count: 2 })

    expect(c.body).toMatch(/nothing is wrong with your account/i)
    expect(c.body).toMatch(/still yours/i)
    expect(c.body).toMatch(/contact us/i)
    expect(c.contactSupport).toBe(true)
    // Must not read as an ordinary error the person should retry away.
    expect(c.body).not.toMatch(/try again|reload/i)
  })

  it.each(['chain_not_configured', 'chain_config_incomplete'] as const)(
    '%s says it is ours and that waiting will not fix it', (kind) => {
      const c = describeClaimFailure({ kind })

      expect(c.body).toMatch(/our problem, not yours/i)
      expect(c.body).toMatch(/will not fix itself while you wait/i)
      // Our table names are not useful to a contributor.
      expect(c.body).not.toMatch(/chain_configs|seed|config/i)
    },
  )

  it('every failure names support, because none of them are the reader to fix', () => {
    const kinds = ['multiple_claims', 'chain_not_configured', 'chain_config_incomplete', 'unknown'] as const
    for (const kind of kinds) {
      const f = kind === 'multiple_claims'
        ? { kind, settlementId: 's', count: 2 } as const
        : { kind } as const
      const c = describeClaimFailure(f)
      expect(c.contactSupport).toBe(true)
      expect(c.body).toMatch(/contact us/i)
    }
  })

  // An unreadable list is not an empty list. Saying "you have no payouts" when
  // the request failed is the same class as the readiness card falling back to
  // not_applicable.
  it('does not let a failed load read as having nothing owed', () => {
    const c = describeClaimFailure({ kind: 'unknown' })
    expect(c.body).toMatch(/not a sign that you have none/i)
  })
})
