import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BountyRepos } from './BountyRepos'
import { getBountyRepos, setBountyRepo, type AgentRepoState, type BountyRepoProject } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/client')>()
  return { ...real, getBountyRepos: vi.fn(), setBountyRepo: vi.fn() }
})

const project = (o: Partial<BountyRepoProject> = {}): BountyRepoProject => ({
  project_id: 'p1', full_name: 'Grainlify/Grainlify-Backend', verified: true,
  github_app_installation_id: 42, registered_project: true, ...o,
})
const agentState = (o: Partial<AgentRepoState> = {}): AgentRepoState => ({
  fullName: 'Grainlify/Grainlify-Backend', allowlisted: true, bountiesEnabled: false,
  registeredProject: true, testCarveOut: false, mayHaveBounties: false,
  whyNot: 'bounties are switched off', lastChangedBy: null, lastChangedAt: null, ...o,
})

beforeEach(() => vi.resetAllMocks())

describe('choosing which repositories may have bounties', () => {
  it('switches bounties on for a verified project', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({ projects: [project()], agent: [agentState()] })
    vi.mocked(setBountyRepo).mockResolvedValue({ ok: true, repos: [agentState({ bountiesEnabled: true })] })
    renderWithProviders(<BountyRepos />)

    await userEvent.click(await screen.findByRole('button', { name: /enable bounties for Grainlify\/Grainlify-Backend/i }))
    expect(vi.mocked(setBountyRepo)).toHaveBeenCalledWith('Grainlify/Grainlify-Backend', true)
  })

  // Both conditions are required and they have different owners. An admin
  // cannot grant verification from this screen, so the button is not offered.
  it('will not let an unverified project be switched on', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({
      projects: [project({ full_name: 'Someone/unverified', verified: false, github_app_installation_id: null, registered_project: false })],
      agent: [agentState({ fullName: 'Someone/unverified', registeredProject: false })],
    })
    renderWithProviders(<BountyRepos />)
    expect(await screen.findByText(/not a verified project with the app installed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enable bounties for Someone\/unverified/i })).toBeDisabled()
  })

  // The state worth noticing, and the one neither side can see alone.
  it('flags a repo that is switched on but no longer eligible', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({
      projects: [project({ verified: false, github_app_installation_id: null, registered_project: false })],
      agent: [agentState({ bountiesEnabled: true, registeredProject: false })],
    })
    renderWithProviders(<BountyRepos />)
    expect(await screen.findByText(/bounties are on, but this repository is not eligible/i)).toBeInTheDocument()
    // Still switch-off-able: that is the fix.
    expect(screen.getByRole('button', { name: /disable bounties for/i })).toBeEnabled()
  })

  it('shows who last changed a repository', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({
      projects: [project()],
      agent: [agentState({ bountiesEnabled: true, lastChangedBy: 'Jagadeeshftw', lastChangedAt: '2026-09-27T10:00:00Z' })],
    })
    renderWithProviders(<BountyRepos />)
    expect(await screen.findByText(/last changed by Jagadeeshftw/i)).toBeInTheDocument()
  })

  it('marks the sandbox as the carve-out rather than as a verified project', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({
      projects: [],
      agent: [agentState({ fullName: 'Grainlify/grainlify-agent-sandbox', registeredProject: false, testCarveOut: true, bountiesEnabled: true })],
    })
    renderWithProviders(<BountyRepos />)
    expect(await screen.findByText(/test carve-out/i)).toBeInTheDocument()
  })

  it('says the agent is unreachable rather than showing everything as off', async () => {
    // Rendering "nothing is switched on" would invite an admin to switch on
    // something that already is.
    vi.mocked(getBountyRepos).mockResolvedValue({ projects: [project()], agent: null })
    renderWithProviders(<BountyRepos />)
    expect(await screen.findByText(/what is currently switched on is unknown/i)).toBeInTheDocument()
  })

  it('states that the signer keeps its own list and does not trust this screen', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({ projects: [project()], agent: [agentState()] })
    renderWithProviders(<BountyRepos />)
    expect(await screen.findByText(/does not trust this screen/i)).toBeInTheDocument()
  })
})
