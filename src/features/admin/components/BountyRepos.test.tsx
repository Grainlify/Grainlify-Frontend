import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BountyRepos } from './BountyRepos'
import { ApiError, getBountyRepos, setBountyRepo, type AgentRepoState, type BountyRepoProject } from '../../../shared/api/client'

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
  it('adds a verified project once it is searched for', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({ projects: [project()], agent: [agentState()] })
    vi.mocked(setBountyRepo).mockResolvedValue({ ok: true, repos: [agentState({ bountiesEnabled: true })] })
    renderWithProviders(<BountyRepos />)

    // Nothing is offered until something is typed: there are hundreds.
    await screen.findByLabelText(/add a repository/i)
    expect(screen.queryByRole('button', { name: /add bounties for/i })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/add a repository/i), 'backend')
    await userEvent.click(await screen.findByRole('button', { name: /add bounties for Grainlify\/Grainlify-Backend/i }))
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
    await userEvent.type(await screen.findByLabelText(/add a repository/i), 'unverified')
    expect(await screen.findByText(/not a verified project with the app installed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add bounties for Someone\/unverified/i })).toBeDisabled()
  })

  // The state worth noticing, and the one neither side can see alone.
  it('flags a repo that is switched on but no longer eligible', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({
      projects: [project({ verified: false, github_app_installation_id: null, registered_project: false })],
      agent: [agentState({ bountiesEnabled: true, registeredProject: false })],
    })
    renderWithProviders(<BountyRepos />)
    // It is switched on, so it is in the "Bounties on" list without searching.
    expect(await screen.findByText(/bounties are on, but this repository is not eligible/i)).toBeInTheDocument()
    // Still removable: that is the fix.
    expect(screen.getByRole('button', { name: /remove bounties for/i })).toBeEnabled()
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

describe('BountyRepos: refusals are shown in words', () => {
  // The screen printed whatever the API put in `error` straight onto the page.
  // In production that meant an admin opening Bounty Repositories was shown
  // the word "lookup_failed" above an empty list, with nothing to say what had
  // failed or whether it was their doing.
  it('does not print the raw refusal code as the whole message', async () => {
    vi.mocked(getBountyRepos).mockRejectedValue(new ApiError('lookup_failed', 500, { error: 'lookup_failed' }))
    renderWithProviders(<BountyRepos />)

    const alert = await screen.findByRole('alert')
    expect(alert).not.toHaveTextContent(/^lookup_failed$/)
    expect(alert).toHaveTextContent(/could not read the list of projects/i)
    // And it says whose fault it is, because an admin's first question is
    // whether they broke something.
    expect(alert).toHaveTextContent(/not something you did/i)
  })

  it('says nothing was changed when the agent cannot be reached', async () => {
    vi.mocked(getBountyRepos).mockRejectedValue(
      new ApiError('agent_unreachable', 502, { error: 'agent_unreachable' }),
    )
    renderWithProviders(<BountyRepos />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/did not answer/i)
    expect(alert).toHaveTextContent(/nothing has been changed/i)
  })

  it('still names an unrecognised code rather than swallowing it', async () => {
    vi.mocked(getBountyRepos).mockRejectedValue(new ApiError('some_new_code', 500, { error: 'some_new_code' }))
    renderWithProviders(<BountyRepos />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/something went wrong/i)
    // The code stays visible: an unmapped refusal is still diagnosable.
    expect(alert).toHaveTextContent(/some_new_code/)
  })
})

describe('BountyRepos: search rather than a wall of rows', () => {
  // 486 projects are eligible. Rendering all of them made the screen a thing
  // to scroll past rather than a thing to use, and buried the handful that
  // actually have bounties switched on.
  const many = (n: number): BountyRepoProject[] =>
    Array.from({ length: n }, (_, i) => project({ project_id: `p${i}`, full_name: `owner${i}/repo${i}` }))
  const manyAgent = (n: number): AgentRepoState[] =>
    Array.from({ length: n }, (_, i) => agentState({ fullName: `owner${i}/repo${i}` }))

  it('lists none of the eligible repositories until something is typed', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({ projects: many(40), agent: manyAgent(40) })
    renderWithProviders(<BountyRepos />)

    expect(await screen.findByText(/40 repositories are eligible/i)).toBeInTheDocument()
    expect(screen.queryByText('owner7/repo7')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /add bounties for/i })).toHaveLength(0)
  })

  it('always shows what is switched on, without searching for it', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({
      projects: [...many(30), project({ project_id: 'live', full_name: 'Grainlify/live-one' })],
      agent: [...manyAgent(30), agentState({ fullName: 'Grainlify/live-one', bountiesEnabled: true })],
    })
    renderWithProviders(<BountyRepos />)

    expect(await screen.findByText('Grainlify/live-one')).toBeInTheDocument()
    expect(screen.getByText(/bounties on \(1\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove bounties for Grainlify\/live-one/i })).toBeInTheDocument()
    // And it is not offered again in the search results.
    expect(screen.queryByRole('button', { name: /add bounties for Grainlify\/live-one/i })).not.toBeInTheDocument()
  })

  it('caps how many matches it shows and says how many it held back', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({ projects: many(40), agent: manyAgent(40) })
    renderWithProviders(<BountyRepos />)

    await userEvent.type(await screen.findByLabelText(/add a repository/i), 'repo')
    expect(screen.getAllByRole('button', { name: /add bounties for/i })).toHaveLength(8)
    expect(screen.getByText(/32 more match/i)).toBeInTheDocument()
  })

  it('says plainly when nothing matches, and why a repository might be absent', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({ projects: many(5), agent: manyAgent(5) })
    renderWithProviders(<BountyRepos />)

    await userEvent.type(await screen.findByLabelText(/add a repository/i), 'nothing-like-this')
    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument()
    expect(screen.getByText(/once Grainlify has verified the project/i)).toBeInTheDocument()
  })

  it('tells an admin with nothing switched on where to start', async () => {
    vi.mocked(getBountyRepos).mockResolvedValue({ projects: many(3), agent: manyAgent(3) })
    renderWithProviders(<BountyRepos />)
    expect(await screen.findByText(/no repository has bounties switched on/i)).toBeInTheDocument()
  })
})
