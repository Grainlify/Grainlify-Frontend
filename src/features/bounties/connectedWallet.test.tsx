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

// Controlled per test: the card must not ask anything until the session is ready.
let auth = { user: { id: 'u1' }, isAuthenticated: true, isLoading: false }
vi.mock('../../shared/contexts/AuthContext', async (orig) => {
  const real = await orig<typeof import('../../shared/contexts/AuthContext')>()
  return { ...real, useAuth: () => auth }
})

const ADDRESS = 'HKMMpctYvofRCSF2uGnqfEGWcmMhD8A86xFqgmWTvcq9'
const challenge = { message: 'Grainlify: read my linked wallet\n…', countersignature: 'sig', expires_at: '2026-09-26T10:00:00Z' }

describe('the connected wallet card', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    auth = { user: { id: 'u1' }, isAuthenticated: true, isLoading: false }
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
    expect(await screen.findByText(/Could not check whether a wallet is linked/)).toBeInTheDocument()
    expect(screen.queryByText('No wallet linked')).not.toBeInTheDocument()
  })

  it('names which call failed and its status, so the screen is the diagnosis', async () => {
    // Three rounds went into guessing at a generic message. The two calls fail
    // for completely different reasons and the page must say which one broke.
    vi.mocked(createBountyWalletReadChallenge).mockRejectedValue(Object.assign(new Error('nope'), { status: 503 }))
    renderWithProviders(<ConnectedWallet />)
    expect(await screen.findByText(/Grainlify: HTTP 503/)).toBeInTheDocument()
  })

  it('distinguishes an agent failure from a Grainlify one', async () => {
    vi.mocked(readWalletLink).mockRejectedValue(new BountyAgentError(401, 'unauthorized'))
    renderWithProviders(<ConnectedWallet />)
    expect(await screen.findByText(/the bounty agent: HTTP 401/)).toBeInTheDocument()
  })

  it('says "network" when there is no status at all', async () => {
    vi.mocked(createBountyWalletReadChallenge).mockRejectedValue(new TypeError('Failed to fetch'))
    renderWithProviders(<ConnectedWallet />)
    expect(await screen.findByText(/Grainlify: network/)).toBeInTheDocument()
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

  it('asks nothing while the session is still loading', async () => {
    // The failure this pins: apiRequest sends a requiresAuth call with no
    // Authorization header when the token is not ready, the backend answers
    // 401, and the 401 handler clears the token. Firing early does not merely
    // fail, it can sign the person out.
    auth = { user: null, isAuthenticated: false, isLoading: true } as never
    renderWithProviders(<ConnectedWallet />)
    await new Promise((r) => setTimeout(r, 20))
    expect(createBountyWalletReadChallenge).not.toHaveBeenCalled()
    expect(screen.queryByText(/could not check/)).not.toBeInTheDocument()
    expect(screen.queryByText('No wallet linked')).not.toBeInTheDocument()
  })

  it('asks nothing when nobody is signed in', async () => {
    auth = { user: null, isAuthenticated: false, isLoading: false } as never
    renderWithProviders(<ConnectedWallet />)
    await new Promise((r) => setTimeout(r, 20))
    expect(createBountyWalletReadChallenge).not.toHaveBeenCalled()
  })
})
