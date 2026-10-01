import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BountyApplications } from './BountyApplications'
import { getMaintainerBountyView, type MaintainerBountyView } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/client')>()
  return { ...real, getMaintainerBountyView: vi.fn() }
})

const view = (o: Partial<MaintainerBountyView> = {}): MaintainerBountyView => ({
  bountyId: 'b1', repo: 'Grainlify/sandbox', issueNumber: 3,
  bountyStatus: 'posted', awaitingRedraw: false, assignment: null, windowOpen: true, applicationsCloseAt: '2026-09-28T10:00:00Z',
  canAssign: false, assignmentIsByDraw: true,
  applicantBucket: 'few', applicantCount: null, applications: null, draw: null, ...o,
})

beforeEach(() => vi.resetAllMocks())

describe('a maintainer looking at bounty applications', () => {
  // The rule this screen exists to enforce. A maintainer has influence over
  // the repository and therefore over applicants.
  it('shows no names while the window is open, and says why', async () => {
    vi.mocked(getMaintainerBountyView).mockResolvedValue(view())
    renderWithProviders(<BountyApplications bountyId="b1" repo="Grainlify/sandbox" />)

    expect(await screen.findByText(/a few applicants/i)).toBeInTheDocument()
    expect(screen.getByText(/names are hidden while applications are open, including from you/i)).toBeInTheDocument()
    expect(screen.getByText(/approached\s+before the draw/i)).toBeInTheDocument()
  })

  it('shows the full list with gate outcomes once the window has closed', async () => {
    vi.mocked(getMaintainerBountyView).mockResolvedValue(
      view({
        windowOpen: false, applicantBucket: null, applicantCount: 2,
        applications: [
          { githubLogin: 'alice', status: 'applied', gateFailureReason: null, fit: 'strong', appliedAt: 'x' },
          { githubLogin: 'bob', status: 'rejected_gate', gateFailureReason: 'no_linked_wallet', fit: null, appliedAt: 'x' },
        ],
      }),
    )
    renderWithProviders(<BountyApplications bountyId="b1" repo="Grainlify/sandbox" />)

    expect(await screen.findByText('alice')).toBeInTheDocument()
    expect(screen.getByText(/not eligible \(no_linked_wallet\)/i)).toBeInTheDocument()
    expect(screen.getByText(/2 applicants/i)).toBeInTheDocument()
  })

  it('shows the winner and the ticket breakdown after the draw', async () => {
    vi.mocked(getMaintainerBountyView).mockResolvedValue(
      view({
        windowOpen: false, applicantBucket: null, applicantCount: 2, applications: [],
        draw: {
          winnerLogin: 'alice', seed: 4242, ranAt: '2026-09-28T10:05:00Z', noWinnerReason: null,
          pool: [
            { githubLogin: 'alice', githubUserId: 1, fit: 'strong', tickets: 3, weights: {}, share: 0.75 },
            { githubLogin: 'bob', githubUserId: 2, fit: 'plausible', tickets: 1, weights: {}, share: 0.25 },
          ],
        },
      }),
    )
    renderWithProviders(<BountyApplications bountyId="b1" repo="Grainlify/sandbox" />)

    expect(await screen.findByText(/drawn: alice/i)).toBeInTheDocument()
    expect(screen.getByText(/seed 4242/i)).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
  })

  // The difference from the GrainHack review screen next door, which IS
  // assignable. A screen that merely happens to have no buttons reads as
  // unfinished rather than as deliberate.
  it('says it is a view and not a review, in every state', async () => {
    for (const v of [view(), view({ windowOpen: false, applications: [], applicantCount: 0 })]) {
      vi.mocked(getMaintainerBountyView).mockResolvedValue(v)
      const { unmount } = renderWithProviders(<BountyApplications bountyId="b1" repo="Grainlify/sandbox" />)
      expect(await screen.findByText(/this is a view, not a review/i)).toBeInTheDocument()
      expect(screen.getByText(/nothing here to accept or reject/i)).toBeInTheDocument()
      unmount()
    }
  })

  it('offers no control that could influence the assignment', async () => {
    vi.mocked(getMaintainerBountyView).mockResolvedValue(
      view({ windowOpen: false, applicantCount: 1, applications: [{ githubLogin: 'alice', status: 'applied', gateFailureReason: null, fit: null, appliedAt: 'x' }] }),
    )
    renderWithProviders(<BountyApplications bountyId="b1" repo="Grainlify/sandbox" />)
    await screen.findByText('alice')
    // The claim is that there is nothing to operate, not that the words
    // never appear - the banner has to say "accept or reject" to explain
    // that you cannot.
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('reports a refusal rather than rendering an empty screen', async () => {
    vi.mocked(getMaintainerBountyView).mockRejectedValue(new Error('not_your_repository'))
    renderWithProviders(<BountyApplications bountyId="b1" repo="Someone/else" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/not_your_repository/)
  })
})
