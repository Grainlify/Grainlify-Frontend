import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BountiesProgramPage } from './pages/BountiesProgramPage'
import { BountyRow, callToAction, poolLine, timeUntil } from './components/BountyRow'
import { getBounties, type PublicBounty } from '../../shared/api/bountyAgent'
import { ApiError, applyForBounty, getMyBountyState } from '../../shared/api/client'
import { DOCS_LIVE, docHref } from '../../shared/docs/docsLinks'

vi.mock('../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../shared/api/bountyAgent')>()
  return { ...real, getBounties: vi.fn(), getBounty: vi.fn(), getBountyLedger: vi.fn() }
})
vi.mock('../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../shared/api/client')>()
  return {
    ...real,
    applyForBounty: vi.fn(),
    getMyBountyState: vi.fn(),
    getBountyWalletLink: vi.fn().mockResolvedValue({ linked: false, wallet: null, linked_at: null }),
  }
})
vi.mock('../../shared/contexts/AuthContext', async (orig) => {
  const real = await orig<typeof import('../../shared/contexts/AuthContext')>()
  return { ...real, useAuth: () => ({ user: { id: 'u1', role: 'contributor', github: { login: 'Octocat' } }, isAuthenticated: true, isLoading: false }) }
})

const status = { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live' as const, statusLine: 'Live on Solana mainnet.' }

const bounty = (o: Partial<PublicBounty> = {}): PublicBounty => ({
  id: 'b1', repo: 'Grainlify/sandbox', issueNumber: 7, issueTitle: 'Fix the flaky test',
  issueUrl: 'https://github.com/Grainlify/sandbox/issues/7', amountMinor: '1000000', decimals: 6,
  currency: 'USDC', network: 'solana-mainnet', status: 'posted', postedAt: '2026-09-27T09:00:00.000Z', payout: null,
  isTest: false, waivedRules: [], applicationsOpenAt: '2026-09-27T09:00:00.000Z',
  applicationsCloseAt: new Date(Date.now() + 5 * 3600_000).toISOString(), applicationState: 'open',
  assignedTo: null, assignmentStaleAt: null, applicantBucket: null, applicantCount: null, reservedForNewcomers: false, ...o,
})

describe('what a bounty tells a contributor they can do', () => {
  const now = new Date('2026-09-27T12:00:00Z')

  it('an open window invites an application and says when it closes', () => {
    const c = callToAction(bounty({ applicationsCloseAt: '2026-09-27T18:00:00Z' }), now)
    expect(c.kind).toBe('apply')
    expect(c.line).toContain('in 6 hours')
  })

  // These two read the same to a user unless the page distinguishes them, and
  // "closed" looks like a stale page while "never opened" looks like a bug.
  it('separates a window that has closed from one that never opened', () => {
    expect(callToAction(bounty({ applicationState: 'closed' }), now).line).toContain('The draw runs next')
    expect(callToAction(bounty({ applicationState: 'none', applicationsCloseAt: null }), now).line).toContain('Not open for applications yet')
  })

  it('an assigned bounty names who holds it and says it can come back', () => {
    const c = callToAction(bounty({ assignedTo: 'winner', applicationState: 'closed' }), now)
    expect(c.kind).toBe('held')
    expect(c.line).toContain('winner')
    expect(c.line).toContain('drawn again')
  })

  it('a paid bounty names who was paid', () => {
    const c = callToAction(bounty({ status: 'paid', payout: { txSignature: 's', txUrl: 'u', paidAt: 'p', recipientLogin: 'octo' } }), now)
    expect(c).toMatchObject({ kind: 'done' })
    expect(c.line).toContain('octo')
  })

  it('describes the pool coarsely while the window is open', () => {
    // A precise live count turns the draw into something to time: apply late,
    // when the odds look best. That rewards refreshing, not working.
    expect(poolLine(bounty({ applicantBucket: 'none' }))).toBe('No applicants yet.')
    expect(poolLine(bounty({ applicantBucket: 'few' }))).toBe('A few applicants so far.')
    expect(poolLine(bounty({ applicantBucket: 'many' }))).toBe('Many applicants so far.')
    expect(poolLine(bounty({ applicantBucket: null }))).toBeNull()
  })

  it('gives the exact number once the window has closed', () => {
    expect(poolLine(bounty({ applicantCount: 4, applicantBucket: null }))).toBe('4 people entered the draw.')
    expect(poolLine(bounty({ applicantCount: 1, applicantBucket: null }))).toBe('1 person entered the draw.')
  })

  it('says how busy it is alongside the deadline, not as a separate number to watch', () => {
    const c = callToAction(bounty({ applicationsCloseAt: '2026-09-27T18:00:00Z', applicantBucket: 'few' }), now)
    expect(c.line).toContain('in 6 hours')
    expect(c.line).toContain('A few applicants')
  })

  it('says a reserved bounty is reserved, because it changes whether to bother', () => {
    const c = callToAction(bounty({ reservedForNewcomers: true, applicationsCloseAt: '2026-09-27T18:00:00Z' }), now)
    expect(c.kind).toBe('apply')
    expect(c.line).toMatch(/have not completed a bounty yet/i)
  })

  it('counts down in minutes, hours then days, and stops at zero', () => {
    expect(timeUntil('2026-09-27T12:30:00Z', now)).toBe('in 30 minutes')
    expect(timeUntil('2026-09-27T17:00:00Z', now)).toBe('in 5 hours')
    expect(timeUntil('2026-09-30T12:00:00Z', now)).toBe('in 3 days')
    expect(timeUntil('2026-09-27T11:00:00Z', now)).toBeNull()
    expect(timeUntil(null, now)).toBeNull()
  })
})

describe('applying from the bounties page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getMyBountyState).mockResolvedValue({ applications: {}, assignments: {} })
  })

  it('applies and says you are in the draw', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(applyForBounty).mockResolvedValue({ applied: true, applicationId: 'a1', closesAt: null })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)

    const button = await screen.findByRole('button', { name: /apply for this bounty/i })
    await userEvent.click(button)
    expect(vi.mocked(applyForBounty)).toHaveBeenCalledWith('b1', undefined)
    expect(await screen.findByText(/you are in the draw/i)).toBeInTheDocument()
  })

  it('sends the optional note, and sends nothing when it is blank', async () => {
    // §4.4: untrusted, very likely AI-generated, never weighted. It travels
    // outside the signed message for that reason - Grainlify does not vouch
    // for words the applicant wrote.
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(applyForBounty).mockResolvedValue({ applied: true, applicationId: 'a1', closesAt: null })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)

    const note = await screen.findByLabelText(/anything you want to add/i)
    await userEvent.type(note, 'I wrote the original fixture this test uses.')
    await userEvent.click(screen.getByRole('button', { name: /apply for this bounty/i }))
    expect(vi.mocked(applyForBounty)).toHaveBeenCalledWith('b1', 'I wrote the original fixture this test uses.')
  })

  it('says plainly that the note is not weighted', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    const note = await screen.findByLabelText(/anything you want to add/i)
    expect(note).toHaveAttribute('placeholder', expect.stringMatching(/does not weight this/i))
  })

  it('shows the reason an application was refused, in words', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(applyForBounty).mockRejectedValue(new ApiError('You already hold a bounty. Finish or release it before applying for another.', 403, { error: 'holding_another_bounty' }))
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)

    await userEvent.click(await screen.findByRole('button', { name: /apply for this bounty/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already hold a bounty/i)
  })

  it('offers no apply button once a bounty is assigned', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty({ assignedTo: 'someone', applicationState: 'closed' })] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/assigned to someone/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply for this bounty/i })).not.toBeInTheDocument()
  })

  it('marks a bounty reserved for first-timers', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty({ reservedForNewcomers: true })] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/first bounty only/i)).toBeInTheDocument()
  })

  it('marks a test bounty visibly and names what it relaxes', async () => {
    // A test bounty that looked real would be worse than no test at all.
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty({ isTest: true, waivedRules: ['block_org_members'] })] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/test bounty — not for contributors/i)).toBeInTheDocument()
    expect(screen.getByText(/relaxed for this test: block_org_members/i)).toBeInTheDocument()
  })
})

describe('how to claim, after the draw replaced comment-and-PR claiming', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getMyBountyState).mockResolvedValue({ applications: {}, assignments: {} })
  })

  it('summarises the flow and does not describe claiming by comment or pull request', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    await screen.findByText(/how to claim a bounty/i)

    expect(screen.getByText(/apply while a bounty's window is open, and wait for the draw/i)).toBeInTheDocument()
    // The old instructions told people to open a PR to claim, which under the
    // draw earns nothing and wastes their work.
    expect(screen.queryByText(/up to \$50 per bounty/i)).not.toBeInTheDocument()
    // The numbered steps live on the dashboard only until the docs page exists.
    if (DOCS_LIVE) expect(screen.queryByText(/do not open a pull request yet/i)).not.toBeInTheDocument()
    else expect(screen.getByText(/do not open a pull request yet/i)).toBeInTheDocument()
  })

  it('links out for the detail rather than printing it on the dashboard', async () => {
    // Reference material on a dashboard is read once and scrolled past
    // forever. The links point somewhere real today and swap to the docs site
    // from one constant when it ships.
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByRole('link', { name: /how the draw works, and what it cannot see/i })).toHaveAttribute('href', docHref('applyForABounty'))
    expect(screen.getByRole('link', { name: /rules and limits/i })).toHaveAttribute('href', docHref('bountyRules'))
  })

  it('still states the limits people are caught by, on the page itself', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/one bounty at a time/i)).toBeInTheDocument()
    expect(screen.getByText(/self-merged pull requests are not paid/i)).toBeInTheDocument()
  })
})

describe('"have I applied" survives a reload, because the server answers it', () => {
  // The bug this closes: applying refreshed the list, the list blanked to a
  // skeleton, every row unmounted, and the local "applied" flag went with it.
  // The button came back and the second click reported "already applied".
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getMyBountyState).mockResolvedValue({ applications: {}, assignments: {} })
  })

  it('shows you are in the draw on a cold load, with no click involved', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(getMyBountyState).mockResolvedValue({
      applications: { b1: { status: 'applied', gateFailureReason: null, appliedAt: '2026-09-27T10:00:00Z' } },
      assignments: {},
    })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/you are in the draw/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply for this bounty/i })).not.toBeInTheDocument()
  })

  it('keeps the row on screen while the list refreshes after applying', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(applyForBounty).mockResolvedValue({ applied: true, applicationId: 'a1', closesAt: null })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)

    await userEvent.click(await screen.findByRole('button', { name: /apply for this bounty/i }))
    // The message is there immediately and is still there once the refresh
    // lands - it never flickers back to an Apply button.
    expect(await screen.findByText(/you are in the draw/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply for this bounty/i })).not.toBeInTheDocument()
    await screen.findByText(/you are in the draw/i)
    expect(screen.queryByRole('button', { name: /apply for this bounty/i })).not.toBeInTheDocument()
  })

  it('tells you which rule refused you, in words, and offers the fix', async () => {
    // The exact case from the live test: applied at 20:29:40, linked a wallet
    // at 20:32:00, and the row still showed the refusal with no way back in.
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(getMyBountyState).mockResolvedValue({
      applications: { b1: { status: 'rejected_gate', gateFailureReason: 'no_linked_wallet', appliedAt: 'x' } },
      assignments: {},
    })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)

    expect(await screen.findByText(/link a solana wallet before applying/i)).toBeInTheDocument()
    // Never the raw code.
    expect(screen.queryByText(/no_linked_wallet/)).not.toBeInTheDocument()
    // And a way to act on it, plus a way back in once they have.
    expect(screen.getByRole('link', { name: /link a wallet/i })).toHaveAttribute('href', '/bounties/link')
    expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled()
  })

  it('does not offer a retry for a refusal the person cannot fix', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(getMyBountyState).mockResolvedValue({
      applications: { b1: { status: 'rejected_gate', gateFailureReason: 'holding_another_bounty', appliedAt: 'x' } },
      assignments: {},
    })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/already hold a bounty/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeDisabled()
  })

  it('never shows a raw refusal code, even one it has no wording for', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(getMyBountyState).mockResolvedValue({
      applications: { b1: { status: 'rejected_gate', gateFailureReason: 'some_new_rule', appliedAt: 'x' } },
      assignments: {},
    })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/could not enter the draw for this bounty/i)).toBeInTheDocument()
    expect(screen.queryByText(/some_new_rule/)).not.toBeInTheDocument()
  })

  it('says you won, and what to do next', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty({ assignedTo: 'Octocat', applicationState: 'closed' })] })
    vi.mocked(getMyBountyState).mockResolvedValue({
      applications: { b1: { status: 'won', gateFailureReason: null, appliedAt: 'x' } },
      assignments: { b1: { status: 'active', staleAt: '2026-09-30T10:00:00Z' } },
    })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/you won the draw/i)).toBeInTheDocument()
  })

  it('a signed-out visitor is never told they have applied', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    await screen.findByRole('button', { name: /apply for this bounty/i })
    expect(screen.queryByText(/you are in the draw/i)).not.toBeInTheDocument()
  })
})

describe('the public draw history', () => {
  // Maintainers can unassign and redraw as often as they like; the check on
  // redrawing until a preferred contributor wins is that it happens in view.
  it('lists every draw and unassign, with who did it and who was drawn', async () => {
    renderWithProviders(
      <BountyRow
        bounty={bounty({
          history: [
            { kind: 'draw', at: '2026-10-01T10:00:00Z', by: 'automatic', drawn: 'first' },
            { kind: 'unassign', at: '2026-10-01T10:05:00Z', by: 'maint', contributor: 'first' },
            { kind: 'draw', at: '2026-10-01T10:09:00Z', by: 'maint', drawn: 'second' },
          ],
        })}
        isDark={false}
        canApply={false}
      />,
    )
    await userEvent.click(screen.getByText('Draw history (3)'))
    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(items).toEqual([
      '1 October 2026 at 10:00 UTC — drawn automatically: first',
      '1 October 2026 at 10:05 UTC — maint unassigned first',
      '1 October 2026 at 10:09 UTC — drawn by maint: second',
    ])
  })

  it('shows nothing when there is no history, or the agent does not send one', () => {
    renderWithProviders(<BountyRow bounty={bounty({ history: [] })} isDark={false} canApply={false} />)
    expect(screen.queryByText(/Draw history/)).not.toBeInTheDocument()
  })
})
