import { describe, it, expect, vi, afterEach } from 'vitest'
import { signChallenge, MultiKeyUnsupportedError, NoWalletError } from './petra'

function installPetra(signMessage: (i: unknown) => unknown) {
  ;(window as unknown as { petra?: unknown }).petra = {
    connect: vi.fn(),
    account: vi.fn(),
    signMessage: vi.fn(signMessage),
  }
}

afterEach(() => {
  delete (window as unknown as { petra?: unknown }).petra
  vi.restoreAllMocks()
})

describe('signChallenge', () => {
  // The three things that produce a VALID SIGNATURE OVER THE WRONG BYTES if
  // missed. Each is invisible in a passing flow: the wallet signs happily and
  // the server rejects something it cannot rebuild.
  it('passes message and nonce through untouched and adds no optional flags', async () => {
    let seen: Record<string, unknown> | undefined
    installPetra((input) => {
      seen = input as Record<string, unknown>
      return { signature: '0xsig' }
    })

    await signChallenge('Verify address ABC', 'nonce-123')

    expect(seen).toEqual({ message: 'Verify address ABC', nonce: 'nonce-123' })
    // Exactly two keys. address, application or chainId each add a line to the
    // envelope Petra signs, and the server rebuilds the envelope from what it
    // issued - it cannot reconstruct a line it never asked for.
    expect(Object.keys(seen ?? {})).toHaveLength(2)
  })

  // The review note from the session that owns the server side. The backend
  // fails safe on this, so it is not a correctness hole - it is a legibility
  // one. A correct rejection that sounds like a broken wallet is worse than a
  // refusal we wrote.
  it('refuses a multi-key account rather than sending the first signature', async () => {
    installPetra(() => ({ signature: ['0xsig-a', '0xsig-b'] }))

    await expect(signChallenge('m', 'n')).rejects.toBeInstanceOf(MultiKeyUnsupportedError)
  })

  // A single-entry array is a single-key account and stays supported: some
  // builds wrap it. Refusing this would break the common case in the name of
  // the rare one.
  it('accepts a single-entry array, which is still one key', async () => {
    installPetra(() => ({ signature: ['0xonly'] }))

    await expect(signChallenge('m', 'n')).resolves.toMatchObject({ signature: '0xonly' })
  })

  it('refuses an empty signature array rather than sending undefined', async () => {
    installPetra(() => ({ signature: [] }))

    await expect(signChallenge('m', 'n')).rejects.toThrow(/no signature/i)
  })

  it('throws NoWalletError when nothing is installed', async () => {
    await expect(signChallenge('m', 'n')).rejects.toBeInstanceOf(NoWalletError)
  })
})
