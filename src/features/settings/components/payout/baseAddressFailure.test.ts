import { describe, it, expect } from 'vitest'
import { classifyBaseFailure } from './baseAddressFailure'
import { ApiError } from '../../../../shared/api/apiError'
import { WalletDeclinedError, WalletRequestPendingError } from '../../../../shared/wallet/evm'

const api = (error: string, detail?: string) => new ApiError(error, 400, { error, ...(detail ? { detail } : {}) })

describe('classifyBaseFailure', () => {
  it.each([
    ['chain_not_enabled', 'closed'],
    ['chain_not_configured', 'closed'],
    ['chain_unsupported', 'closed'],
    ['chain_family_unknown', 'closed'],
    ['signature_invalid', 'signature_invalid'],
    ['address_malformed', 'address_rejected'],
    ['address_reserved', 'address_rejected'],
    ['nonce_expired', 'nonce_expired'],
    ['nonce_used', 'nonce_spent'],
    ['nonce_unknown', 'nonce_spent'],
    ['nonce_wrong_purpose', 'nonce_spent'],
    ['address_registered_to_another_account', 'another_account'],
    ['address_unchanged', 'unchanged'],
    ['store_failed', 'store_failed'],
    ['something_new', 'unknown'],
  ])('%s -> %s', (code, kind) => {
    expect(classifyBaseFailure(api(code)).kind).toBe(kind)
  })

  // Rejected before the request is consumed vs consumed with nothing changed.
  // Same-sounding to a person, different facts; they must stay two kinds.
  it('keeps signature_invalid and address_unchanged apart', () => {
    expect(classifyBaseFailure(api('signature_invalid')).kind).not.toBe(
      classifyBaseFailure(api('address_unchanged')).kind,
    )
  })

  it('keeps the server detail where it is shown verbatim', () => {
    expect(classifyBaseFailure(api('address_registered_to_another_account', 'the words')).detail).toBe('the words')
  })

  it('maps wallet errors and anything else', () => {
    expect(classifyBaseFailure(new WalletDeclinedError()).kind).toBe('declined')
    expect(classifyBaseFailure(new WalletRequestPendingError()).kind).toBe('request_pending')
    expect(classifyBaseFailure(new Error('network')).kind).toBe('unknown')
    expect(classifyBaseFailure(new ApiError('x', 500, undefined)).kind).toBe('unknown')
  })
})
