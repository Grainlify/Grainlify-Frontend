import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'

const h = vi.hoisted(() => ({ getBountyWalletLink: vi.fn() }))
vi.mock('../../../../shared/api/client', async (orig) => ({
  ...(await orig<object>()),
  getBountyWalletLink: h.getBountyWalletLink,
}))

import { SolanaPayoutWalletCard } from './SolanaPayoutWalletCard'

const card = () => screen.getByTestId('solana-wallet-card')
const WALLET = 'B59o4iL4PUzBVdbTmCtbgg2RSLKn4arRkAj1JmGysouw'

beforeEach(() => vi.clearAllMocks())

describe('SolanaPayoutWalletCard', () => {
  it('shows the linked wallet as the payout wallet for Bounties and GrainHack', async () => {
    h.getBountyWalletLink.mockResolvedValue({ linked: true, wallet: WALLET, linked_at: '2026-09-26T08:00:00Z' })
    renderWithProviders(<SolanaPayoutWalletCard />)
    await waitFor(() => expect(card().dataset.state).toBe('linked'))
    expect(screen.getByTestId('solana-wallet-address')).toHaveTextContent(WALLET)
    for (const p of screen.getAllByTestId('solana-wallet-pill')) expect(p).toHaveTextContent('Linked')
    expect(card()).toHaveTextContent('Bounties and GrainHack pay USDC on Solana')
    expect(card()).toHaveTextContent('Linked 26 September 2026')
    expect(screen.getByRole('link', { name: 'Link a different wallet' })).toHaveAttribute('href', '/bounties/link')
  })

  it('sends someone with no wallet to the link page', async () => {
    h.getBountyWalletLink.mockResolvedValue({ linked: false, wallet: null, linked_at: null })
    renderWithProviders(<SolanaPayoutWalletCard />)
    await waitFor(() => expect(card().dataset.state).toBe('not-linked'))
    expect(screen.getByRole('link', { name: 'Link a Solana wallet' })).toHaveAttribute('href', '/bounties/link')
    expect(card()).toHaveTextContent("isn't dropped: their payout waits")
  })

  it('never says "not linked" when the read failed', async () => {
    h.getBountyWalletLink.mockRejectedValue(new Error('503'))
    renderWithProviders(<SolanaPayoutWalletCard />)
    await waitFor(() => expect(card().dataset.state).toBe('load-failed'))
    expect(card()).not.toHaveTextContent('Not linked')
    expect(card()).toHaveTextContent("Couldn't check which Solana wallet is linked")
  })

  it("says GrainHack's first event paid on Base Sepolia, and that it now pays on Solana", async () => {
    h.getBountyWalletLink.mockResolvedValue({ linked: false, wallet: null, linked_at: null })
    renderWithProviders(<SolanaPayoutWalletCard />)
    await waitFor(() => expect(card().dataset.state).toBe('not-linked'))
    expect(card()).toHaveTextContent('first event paid test USDC on the Base Sepolia testnet')
  })
})
