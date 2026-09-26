import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ConnectedWallet, shortAddress } from './components/ConnectedWallet'
import { readWalletLink, BountyAgentError } from '../../shared/api/bountyAgent'
import { createBountyWalletReadChallenge } from '../../shared/api/client'

vi.mock('../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../shared/api/bountyAgent')>()
  return { ...real, readWalletLink: vi.fn() }
})
vi.mock('../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../shared/api/client')>()
  return { ...real, createBountyWalletReadChallenge: vi.fn() }
})

const ADDRESS = 'HKMMpctYvofRCSF2uGnqfEGWcmMhD8A86xFqgmWTvcq9'
const challenge = { message: 'Grainlify: read my linked wallet\n…', countersignature: 'sig', expires_at: '2026-09-26T10:00:00Z' }

describe('the connected wallet card', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(createBountyWalletReadChallenge).mockResolvedValue(challenge)
  })

  it('shows the linked wallet instead of asking again — the bug this fixes', async () => {
    vi.mocked(readWalletLink).mockResolvedValue({ linked: true, wallet: ADDRESS, linkedAt: '2026-09-26T09:00:00Z', githubLogin: 'Octocat' })
    renderWithProviders(<ConnectedWallet />)
    expect(await screen.findByText('Wallet linked')).toBeInTheDocument()
    expect(screen.getByText(/HKMM…vcq9/)).toBeInTheDocument()
    // The whole point: somebody who has linked must not be told to link.
    expect(screen.queryByRole('link', { name: /Link your wallet/ })).not.toBeInTheDocument()
  })

  it('asks for a wallet only when there genuinely is not one', async () => {
    vi.mocked(readWalletLink).mockResolvedValue({ linked: false, wallet: null, linkedAt: null, githubLogin: 'Octocat' })
    renderWithProviders(<ConnectedWallet />)
    expect(await screen.findByText('No wallet linked')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Link your wallet/ })).toBeInTheDocument()
  })

  it('says it could not tell, rather than claiming no wallet is linked', async () => {
    // The failure that caused the original bug was answering "not linked" to a
    // question we had not actually asked. Unknown must not render as absent.
    vi.mocked(readWalletLink).mockRejectedValue(new BountyAgentError(0, 'unreachable'))
    renderWithProviders(<ConnectedWallet />)
    expect(await screen.findByText(/could not check whether a wallet is linked/)).toBeInTheDocument()
    expect(screen.queryByText('No wallet linked')).not.toBeInTheDocument()
  })

  it('copies the full address, not the shortened one', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    vi.mocked(readWalletLink).mockResolvedValue({ linked: true, wallet: ADDRESS, linkedAt: null, githubLogin: 'Octocat' })
    renderWithProviders(<ConnectedWallet />)
    await userEvent.click(await screen.findByRole('button', { name: /Copy wallet address/ }))
    expect(writeText).toHaveBeenCalledWith(ADDRESS)
  })

  it('shortens an address from both ends and leaves a short one alone', () => {
    expect(shortAddress(ADDRESS)).toBe('HKMM…vcq9')
    expect(shortAddress('short')).toBe('short')
  })
})
