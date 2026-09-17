import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { ApiError } from '../../../../shared/api/apiError'
import type { EvmWallet } from '../../../../shared/wallet/evm'

const h = vi.hoisted(() => ({
  wallets: [] as unknown[],
  getPayoutAddress: vi.fn(),
  createPayoutAddressChallenge: vi.fn(),
  registerPayoutAddress: vi.fn(),
  connectEvmWallet: vi.fn(),
  signEvmChallenge: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('../../../../shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPayoutAddress: h.getPayoutAddress,
  createPayoutAddressChallenge: h.createPayoutAddressChallenge,
  registerPayoutAddress: h.registerPayoutAddress,
}))

vi.mock('../../../../shared/wallet/evm', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  watchEvmWallets: (fn: (w: unknown[]) => void) => {
    fn(h.wallets)
    return () => {}
  },
  connectEvmWallet: h.connectEvmWallet,
  signEvmChallenge: h.signEvmChallenge,
}))

import { BaseAddressCard } from './BaseAddressCard'
import { WalletDeclinedError, WalletRequestPendingError } from '../../../../shared/wallet/evm'

const ADDR = '0xe623ed51dbe14e054b9595079c50f1a41feae2c1'
const EXISTING = {
  chain_id: 'base-sepolia',
  address: '0xE623Ed51dbE14e054b9595079c50f1a41FeAe2c1',
  verified_at: '2026-09-16T10:00:00Z',
}
const MESSAGE =
  'Grainlify payout address verification\nChain: base-sepolia\nAddress: 0xE623Ed51dbE14e054b9595079c50f1a41FeAe2c1\nNonce: abc_-123'

function wallet(over: Partial<EvmWallet> = {}): EvmWallet {
  return {
    key: 'io.example.a',
    name: 'Wallet A',
    icon: null,
    rdns: 'io.example.a',
    legacy: false,
    conflict: false,
    provider: { request: vi.fn() },
    ...over,
  }
}

function apiError(error: string, detail?: string) {
  return new ApiError(error, 400, detail ? { error, detail } : { error })
}

const card = () => screen.getByTestId('base-address-card')
const pillText = () => within(card()).getAllByTestId('base-pill')[0].textContent

async function renderCard(existing: typeof EXISTING | null = null) {
  h.getPayoutAddress.mockResolvedValue(existing)
  renderWithProviders(<BaseAddressCard chainId="base-sepolia" />)
  await waitFor(() => expect(card().dataset.state).not.toBe('loading'))
}

/** Clicks through to the picker and picks the first wallet. */
async function pickFirstWallet(existing = false) {
  fireEvent.click(screen.getByRole('button', { name: existing ? 'Register a different address' : 'Connect wallet and sign' }))
  fireEvent.click(within(screen.getByTestId('base-wallet-picker')).getByRole('button', { name: /Wallet A/ }))
}

async function failWith(err: unknown, existing: typeof EXISTING | null = null) {
  h.connectEvmWallet.mockResolvedValue(ADDR)
  h.createPayoutAddressChallenge.mockResolvedValue({ nonce: 'abc_-123', message: MESSAGE, expires_at: '' })
  h.signEvmChallenge.mockResolvedValue('0xSIG')
  h.registerPayoutAddress.mockRejectedValue(err)
  await renderCard(existing)
  await pickFirstWallet(existing !== null)
  await waitFor(() => expect(card().dataset.state).toMatch(/^failed-|^closed$/))
}

beforeEach(() => {
  vi.clearAllMocks()
  h.wallets = [wallet()]
})

describe('BaseAddressCard', () => {
  it('state 1: a failed load is not "none registered"', async () => {
    h.getPayoutAddress.mockRejectedValue(new Error('boom'))
    renderWithProviders(<BaseAddressCard chainId="base-sepolia" />)
    await waitFor(() => expect(card().dataset.state).toBe('load-failed'))
    expect(pillText()).toBe("Couldn't check")
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('not registered: says Base pays directly and offers to connect', async () => {
    await renderCard()
    expect(card().dataset.state).toBe('not-registered')
    expect(card()).toHaveTextContent('USDC on Base, sent straight to this address. Nothing to claim.')
    expect(pillText()).toBe('Not registered')
    expect(screen.getByRole('button', { name: 'Connect wallet and sign' })).toBeEnabled()
  })

  it('state 3: no wallet found disables the button and says why', async () => {
    h.wallets = []
    await renderCard()
    expect(card().dataset.state).toBe('no-wallet')
    expect(screen.getByTestId('base-no-wallet')).toHaveTextContent('No Ethereum wallet found in this browser.')
    expect(screen.getByRole('button', { name: 'Connect wallet and sign' })).toBeDisabled()
  })

  it('state 15: the picker shows even a single wallet, and does not connect by itself', async () => {
    await renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet and sign' }))
    const picker = screen.getByTestId('base-wallet-picker')
    expect(within(picker).getByRole('button', { name: /Wallet A/ })).toHaveTextContent('io.example.a')
    expect(h.connectEvmWallet).not.toHaveBeenCalled()

    fireEvent.click(within(picker).getByRole('button', { name: 'Cancel' }))
    expect(card().dataset.state).toBe('not-registered')
  })

  it('state 15: a conflicting rdns is shown but cannot be picked', async () => {
    h.wallets = [wallet(), wallet({ key: 'io.example.c', rdns: 'io.example.c', name: 'Wallet C', conflict: true })]
    await renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet and sign' }))
    const row = screen.getByTestId('base-wallet-conflict')
    expect(row).toHaveTextContent('io.example.c')
    expect(row).toHaveTextContent('Two installed extensions both claim to be this wallet.')
    expect(within(row).queryByRole('button')).not.toBeInTheDocument()
  })

  it('state 13: shows the server message verbatim and signs exactly that', async () => {
    let finishSign: (s: string) => void = () => {}
    h.connectEvmWallet.mockResolvedValue(ADDR)
    h.createPayoutAddressChallenge.mockResolvedValue({ nonce: 'abc_-123', message: MESSAGE, expires_at: '' })
    h.signEvmChallenge.mockImplementation(() => new Promise((r) => { finishSign = r }))
    await renderCard()
    await pickFirstWallet()

    await waitFor(() => expect(card().dataset.state).toBe('signing'))
    expect(pillText()).toBe('Waiting for your wallet')
    expect(screen.getByTestId('base-signed-message').textContent).toBe(MESSAGE)
    expect(h.createPayoutAddressChallenge).toHaveBeenCalledWith('base-sepolia', ADDR)
    expect(h.signEvmChallenge).toHaveBeenCalledWith(h.wallets[0], MESSAGE, ADDR)
    expect(screen.getByRole('button', { name: 'Waiting for signature…' })).toBeDisabled()
    finishSign('0xSIG')
  })

  it('state 5 then verified: posts the signature untouched and shows the result', async () => {
    let finishPost: (v: unknown) => void = () => {}
    h.connectEvmWallet.mockResolvedValue(ADDR)
    h.createPayoutAddressChallenge.mockResolvedValue({ nonce: 'abc_-123', message: MESSAGE, expires_at: '' })
    h.signEvmChallenge.mockResolvedValue('0xAbC')
    h.registerPayoutAddress.mockImplementation(() => new Promise((r) => { finishPost = r }))
    await renderCard()
    await pickFirstWallet()

    await waitFor(() => expect(card().dataset.state).toBe('verifying'))
    expect(pillText()).toBe('Checking signature')
    expect(card()).toHaveTextContent('Signed. Checking the signature for 0xe623…e2c1')
    expect(h.registerPayoutAddress).toHaveBeenCalledWith({
      chainId: 'base-sepolia', address: ADDR, publicKey: '', signature: '0xAbC', nonce: 'abc_-123',
    })

    finishPost({ ...EXISTING, replaced: null })
    await waitFor(() => expect(card().dataset.state).toBe('verified'))
    expect(pillText()).toBe('Verified')
    expect(screen.getByTestId('base-address')).toHaveTextContent(EXISTING.address)
    expect(card()).toHaveTextContent('base-sepolia · checked by signature')
  })

  it('state 4: declined in the wallet', async () => {
    h.connectEvmWallet.mockRejectedValue(new WalletDeclinedError())
    await renderCard()
    await pickFirstWallet()
    await waitFor(() => expect(card().dataset.state).toBe('failed-declined'))
    expect(card()).toHaveTextContent('You declined the signature in your wallet. Nothing was saved.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
  })

  it('a request already open in the wallet says to finish it there', async () => {
    h.connectEvmWallet.mockRejectedValue(new WalletRequestPendingError())
    await renderCard()
    await pickFirstWallet()
    await waitFor(() => expect(card().dataset.state).toBe('failed-request_pending'))
    expect(card()).toHaveTextContent('Your wallet already has a request open.')
  })

  it('state 2: a chain that is not open removes the button', async () => {
    h.connectEvmWallet.mockResolvedValue(ADDR)
    h.createPayoutAddressChallenge.mockRejectedValue(apiError('chain_not_enabled'))
    await renderCard()
    await pickFirstWallet()
    await waitFor(() => expect(card().dataset.state).toBe('closed'))
    expect(pillText()).toBe('Not open yet')
    expect(card()).toHaveTextContent("Payouts on Base aren't open yet.")
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('state 6: signature_invalid names the connected account', async () => {
    await failWith(apiError('signature_invalid'))
    expect(card().dataset.state).toBe('failed-signature_invalid')
    expect(pillText()).toBe('Action needed')
    expect(card()).toHaveTextContent("The signature didn't verify. Nothing was saved.")
    expect(card()).toHaveTextContent('Make sure your wallet is signing with 0xe623…e2c1, the account shown here.')
  })

  it('state 7: an address the server rejects shows its detail', async () => {
    await failWith(apiError('address_reserved', 'that address is reserved'))
    expect(card().dataset.state).toBe('failed-address_rejected')
    expect(card()).toHaveTextContent("Your wallet gave an address we couldn't accept. Nothing was saved.")
    expect(card()).toHaveTextContent('Details: that address is reserved')
    expect(screen.getByRole('button', { name: 'Start again' })).toBeEnabled()
  })

  it('state 8: an expired request', async () => {
    await failWith(apiError('nonce_expired'))
    expect(card()).toHaveTextContent('The signing request expired. It only lasts ten minutes. Nothing was saved.')
  })

  it.each(['nonce_used', 'nonce_unknown', 'nonce_wrong_purpose'])('state 9: %s', async (code) => {
    await failWith(apiError(code))
    expect(card().dataset.state).toBe('failed-nonce_spent')
    expect(card()).toHaveTextContent('That signing request was already used. Start again to get a new one.')
  })

  it("state 10: another account's address shows the server's own words", async () => {
    const detail = 'This address is already the payout address for a different Grainlify account.'
    await failWith(apiError('address_registered_to_another_account', detail))
    expect(pillText()).toBe("Can't use this address")
    expect(card()).toHaveTextContent('This address belongs to another Grainlify account.')
    expect(card()).toHaveTextContent(detail)
    expect(screen.getByRole('button', { name: 'Use a different address' })).toBeEnabled()
  })

  // The load-bearing distinction: the request WAS consumed here, and the
  // registration was not touched. Neither is true of state 12.
  it('state 11: unchanged says the registration was untouched and the signature is used up', async () => {
    await failWith(apiError('address_unchanged'), EXISTING)
    expect(card().dataset.state).toBe('failed-unchanged')
    expect(pillText()).toBe('Verified')
    const msg = screen.getByTestId('base-failure-unchanged')
    expect(msg).toHaveTextContent('That address is already your Base payout address.')
    expect(msg).toHaveTextContent("Your registration wasn't touched: it keeps its original verified date.")
    expect(msg).toHaveTextContent('The signature you just made has been used up')
    expect(msg).not.toHaveTextContent("wasn't saved")
    expect(card()).toHaveTextContent('Verified 16 September 2026 · base-sepolia · checked by signature')
    fireEvent.click(screen.getByRole('button', { name: 'Register a different address' }))
    expect(screen.getByTestId('base-wallet-picker')).toBeInTheDocument()
  })

  it('state 12: a failed replacement keeps the pill and the address, and was not consumed', async () => {
    await failWith(apiError('signature_invalid'), EXISTING)
    expect(pillText()).toBe('Verified')
    expect(screen.getByTestId('base-address')).toHaveTextContent(EXISTING.address)
    expect(card()).toHaveTextContent('Still your payout address')
    const msg = screen.getByTestId('base-failure-signature_invalid')
    expect(msg).toHaveTextContent("The new address wasn't saved. The signature didn't verify, so your current address is unchanged.")
    expect(msg).not.toHaveTextContent('used up')
    expect(screen.getByRole('button', { name: 'Try a different address again' })).toBeEnabled()
  })

  it('state 14: store_failed says the signature cannot be reused', async () => {
    await failWith(apiError('store_failed'))
    expect(card().dataset.state).toBe('failed-store_failed')
    expect(card()).toHaveTextContent("Your signature checked out, but we couldn't save the address.")
    expect(card()).toHaveTextContent("Nothing was saved. That signature can't be reused, so start again and sign once more.")
  })

  // The fallback is for failures nobody classified, so it must not claim an
  // outcome. After the registration request went out, the save may or may not
  // have landed.
  it('an unclassified failure after the request was sent says the outcome is unknown', async () => {
    await failWith(new Error('Network error: Unable to connect to the server.'))
    expect(card().dataset.state).toBe('failed-unknown-after-send')
    expect(pillText()).toBe('Status unknown')
    const msg = screen.getByTestId('base-failure-unknown')
    expect(msg).toHaveTextContent("Something went wrong, and we can't tell whether your address was saved.")
    expect(msg).not.toHaveTextContent(/nothing was saved/i)

    // "Check again" re-reads the address instead of inviting a second attempt.
    h.getPayoutAddress.mockResolvedValue({ ...EXISTING })
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }))
    await waitFor(() => expect(card().dataset.state).toBe('verified'))
    expect(h.getPayoutAddress).toHaveBeenCalledTimes(2)
  })

  it('does not keep claiming Verified when a replacement ended in an unknown outcome', async () => {
    await failWith(new ApiError('boom', 502, undefined), EXISTING)
    expect(pillText()).toBe('Status unknown')
    expect(card()).toHaveTextContent('Your payout address before this attempt')
    expect(card()).not.toHaveTextContent('Still your payout address')
  })

  it('an unclassified failure before anything was sent can say nothing was saved', async () => {
    h.connectEvmWallet.mockResolvedValue(ADDR)
    h.createPayoutAddressChallenge.mockRejectedValue(new Error('Network error'))
    await renderCard()
    await pickFirstWallet()
    await waitFor(() => expect(card().dataset.state).toBe('failed-unknown'))
    expect(card()).toHaveTextContent('Something went wrong before your address was sent. Nothing was saved.')
    expect(h.registerPayoutAddress).not.toHaveBeenCalled()
  })

  // No default chain: both Base rows are enabled server-side, so a default
  // would register everybody on one of them without anyone noticing.
  it('refuses to render a registration flow when no chain is configured', async () => {
    renderWithProviders(<BaseAddressCard chainId={null} />)
    expect(card().dataset.state).toBe('unconfigured')
    expect(pillText()).toBe('Unavailable')
    expect(card()).toHaveTextContent("Registering a Base payout address isn't available on this site yet")
    expect(card()).toHaveTextContent('VITE_BASE_PAYOUT_CHAIN_ID is not set')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(h.getPayoutAddress).not.toHaveBeenCalled()
  })

  it('renders in the dark theme with the dark tokens', async () => {
    h.getPayoutAddress.mockResolvedValue(EXISTING)
    renderWithProviders(<BaseAddressCard chainId="base-sepolia" />, { theme: 'dark' })
    await waitFor(() => expect(card().dataset.state).toBe('verified'))
    expect(screen.getByText('Base payout address').className).toContain('text-[#f5efe5]')
  })
})
