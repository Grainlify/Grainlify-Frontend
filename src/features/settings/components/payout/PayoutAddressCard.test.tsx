import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleRegisterError } from './PayoutAddressCard'
import { NoWalletError } from '../../../../shared/wallet/petra'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

/** Each of these is a different next action for the person, and the reason the
 *  component enumerates them instead of showing one error toast. A stale nonce
 *  and a wrong account are both "it didn't work", and the fix for one is
 *  nothing like the fix for the other.
 */
describe('handleRegisterError', () => {
  let mismatch: { claimed: string; derived: string } | null
  const setMismatch = (m: { claimed: string; derived: string } | null) => { mismatch = m }
  beforeEach(() => { mismatch = null })

  it('tells somebody with no wallet to install one, not to try again', () => {
    const msg = handleRegisterError(new NoWalletError(), setMismatch)
    expect(msg).toMatch(/install/i)
    expect(msg).not.toMatch(/try again/i)
  })

  // The server returns both addresses precisely so this is fixable without a
  // support round trip. Collapsing it to "signature invalid" throws that away.
  it('surfaces both addresses when the signing key belongs to a different account', () => {
    const body = '{"error":"signature_address_mismatch","claimed":"0xaaa","derived":"0xbbb"}'
    handleRegisterError(new Error(body), setMismatch)
    expect(mismatch).toEqual({ claimed: '0xaaa', derived: '0xbbb' })
  })

  it.each([
    ['address_unchanged', /already registered/i],
    ['nonce_expired', /expired/i],
    ['nonce_used', /already used/i],
    ['unsupported_scheme', /Petra/],
    ['signature_invalid', /didn't verify/i],
    ['User rejected the request', /declined/i],
  ])('names the next action for %s', (raw, want) => {
    expect(handleRegisterError(new Error(raw), setMismatch)).toMatch(want)
  })

  // An unknown failure must still say nothing was saved. "Something went wrong"
  // leaves somebody wondering whether to register again and risk a duplicate.
  it('says nothing was saved when it cannot classify the failure', () => {
    expect(handleRegisterError(new Error('kaboom'), setMismatch)).toBe('unknown')
  })

  // A mismatch is not routed through the generic branch, or the specific
  // addresses would be replaced by a vaguer message.
  it('does not fall through to the generic message on a mismatch', () => {
    const body = '{"claimed":"0x1","derived":"0x2"}'
    expect(handleRegisterError(new Error(body), setMismatch)).toBe('address mismatch')
  })
})
