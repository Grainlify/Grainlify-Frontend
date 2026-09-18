import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { GrainHackEventDetailPage } from './GrainHackEventDetailPage'
import { getHackathon, getHackathonIssues, type PublicHackathonIssue } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  getHackathon: vi.fn(),
  getHackathonIssues: vi.fn(),
}))

const mockedGetHackathon = vi.mocked(getHackathon)
const mockedGetHackathonIssues = vi.mocked(getHackathonIssues)

type Hackathon = Awaited<ReturnType<typeof getHackathon>>

function makeHackathon(overrides: Partial<Hackathon> & Pick<Hackathon, 'id' | 'name' | 'phase'>): Hackathon {
  return {
    announced_at: null,
    application_period_start: null,
    application_period_end: null,
    issue_prep_start: null,
    starts_at: null,
    ends_at: null,
    merge_grace_period_hours: 72,
    sponsor_total_usdc: '10',
    platform_fee_usdc: '2',
    platform_fee_rate_pct: '20',
    contributor_prize_pool: '8.000000',  // the shape the API actually returns
    maintainer_prize_pool: '2',
    net_pool_usdc: '10',
    created_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeIssue(overrides: Partial<PublicHackathonIssue> & Pick<PublicHackathonIssue, 'id' | 'issue_number' | 'project_id'>): PublicHackathonIssue {
  return {
    repo_full_name: 'Jagadeeshftw/grainhack-sandbox',
    issue_title: 'Fix the flaky retry loop in the sandbox worker',
    difficulty_tier: 'easy',
    acceptance_criteria: 'The retry loop backs off exponentially.',
    reserved: false,
    application_window_opens_at: '2026-09-18T00:00:00.000Z',
    application_window_closes_at: '2026-09-19T00:00:00.000Z',
    assigned: false,
    ...overrides,
  }
}

describe('GrainHackEventDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the issue_prep empty state exactly as designed when there are no published issues', async () => {
    mockedGetHackathon.mockResolvedValue(
      makeHackathon({ id: 'hack-1', name: 'KeeperHub Base Sepolia Live Test', phase: 'issue_prep' }),
    )
    mockedGetHackathonIssues.mockResolvedValue({ issues: [] })

    renderWithProviders(
      <GrainHackEventDetailPage eventId="hack-1" eventName="KeeperHub Base Sepolia Live Test" onBack={vi.fn()} onIssueClick={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Issues are being added')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/Maintainers are preparing this event's issues/),
    ).toBeInTheDocument()
    expect(screen.getByText('Issue prep')).toBeInTheDocument()
    expect(screen.getByText('$8.00')).toBeInTheDocument()
  })

  it('says the event could not be loaded instead of "No issues were published"', async () => {
    mockedGetHackathon.mockResolvedValue(makeHackathon({ id: 'hack-1', name: 'First GrainHack Event (Base Sepolia)', phase: 'live' }))
    mockedGetHackathonIssues.mockRejectedValue(new Error('network down'))

    renderWithProviders(
      <GrainHackEventDetailPage eventId="hack-1" eventName="First GrainHack Event (Base Sepolia)" onBack={vi.fn()} onIssueClick={vi.fn()} />,
    )

    expect(await screen.findByText("Couldn't load this event")).toBeInTheDocument()
    expect(screen.queryByText('No issues were published')).not.toBeInTheDocument()
    // The way back stays available.
    expect(screen.getByRole('button', { name: /all events/i })).toBeInTheDocument()
  })

  it('shows different empty-state copy for application_period than for issue_prep', async () => {
    mockedGetHackathon.mockResolvedValue(makeHackathon({ id: 'hack-2', name: 'Not Open Yet', phase: 'application_period' }))
    mockedGetHackathonIssues.mockResolvedValue({ issues: [] })

    renderWithProviders(
      <GrainHackEventDetailPage eventId="hack-2" eventName="Not Open Yet" onBack={vi.fn()} onIssueClick={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Issues have not been added yet')).toBeInTheDocument()
    })
    expect(screen.queryByText('Issues are being added')).not.toBeInTheDocument()
  })

  it('renders published issues with title, tier, repo/number, and no applicant or contention signal', async () => {
    mockedGetHackathon.mockResolvedValue(makeHackathon({ id: 'hack-3', name: 'Live Event', phase: 'issue_prep' }))
    const issue = makeIssue({ id: 'issue-row-1', issue_number: 1, project_id: 'proj-1' })
    mockedGetHackathonIssues.mockResolvedValue({ issues: [issue] })

    const { container } = renderWithProviders(
      <GrainHackEventDetailPage eventId="hack-3" eventName="Live Event" onBack={vi.fn()} onIssueClick={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Fix the flaky retry loop in the sandbox worker')).toBeInTheDocument()
    })
    expect(screen.getByText('easy')).toBeInTheDocument()
    expect(screen.getByText('Jagadeeshftw/grainhack-sandbox #1')).toBeInTheDocument()
    expect(screen.getByText('1 issue open')).toBeInTheDocument()

    // The same anti-farming check the backend test runs on the raw response
    // body: no applicant count, bucket, or any other contention signal
    // anywhere in what actually renders.
    const rendered = container.textContent ?? ''
    for (const forbidden of ['applicant', 'Applicant']) {
      expect(rendered).not.toContain(forbidden)
    }
  })

  it('routes an issue click through onIssueClick with the GitHub issue number and project id, not the hackathon_issues row id', async () => {
    mockedGetHackathon.mockResolvedValue(makeHackathon({ id: 'hack-4', name: 'Live Event', phase: 'issue_prep' }))
    const issue = makeIssue({ id: 'hackathon-issue-row-uuid', issue_number: 7, project_id: 'proj-77' })
    mockedGetHackathonIssues.mockResolvedValue({ issues: [issue] })
    const onIssueClick = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <GrainHackEventDetailPage eventId="hack-4" eventName="Live Event" onBack={vi.fn()} onIssueClick={onIssueClick} />,
    )

    const button = await screen.findByRole('button', { name: 'View issue' })
    await user.click(button)

    expect(onIssueClick).toHaveBeenCalledTimes(1)
    // The repo name travels with the click so the detail page can label the
    // list even when GET /projects/:id cannot resolve the project.
    expect(onIssueClick).toHaveBeenCalledWith('7', 'proj-77', 'Jagadeeshftw/grainhack-sandbox')
  })

  // The live event, the day after its draws ran: windows closed, both issues
  // held. The page used to say the draw was still coming and count both open.
  it('says an issue is assigned once its draw has run, and stops counting it as open', async () => {
    mockedGetHackathon.mockResolvedValue(makeHackathon({ id: 'hack-5', name: 'First GrainHack Event (Base Sepolia)', phase: 'live' }))
    mockedGetHackathonIssues.mockResolvedValue({
      issues: [
        makeIssue({ id: 'row-1', issue_number: 1, project_id: 'proj-1', application_window_closes_at: '2026-09-18T15:05:31Z', assigned: true }),
        makeIssue({ id: 'row-2', issue_number: 2, project_id: 'proj-1', issue_title: 'Validate --concurrency', application_window_closes_at: '2026-09-18T15:05:31Z', assigned: true }),
      ],
    })

    const { container } = renderWithProviders(
      <GrainHackEventDetailPage eventId="hack-5" eventName="First GrainHack Event (Base Sepolia)" onBack={vi.fn()} onIssueClick={vi.fn()} />,
    )

    expect(await screen.findByText('2 issues assigned')).toBeInTheDocument()
    expect(screen.getAllByText('Assigned')).toHaveLength(2)
    const rendered = container.textContent ?? ''
    expect(rendered).not.toContain('the draw runs shortly')
    expect(rendered).not.toMatch(/\bopen\b/)
  })

  it('counts a mix of open and assigned issues separately', async () => {
    mockedGetHackathon.mockResolvedValue(makeHackathon({ id: 'hack-6', name: 'Mixed', phase: 'live' }))
    mockedGetHackathonIssues.mockResolvedValue({
      issues: [
        makeIssue({ id: 'row-1', issue_number: 1, project_id: 'proj-1', assigned: true }),
        makeIssue({ id: 'row-2', issue_number: 2, project_id: 'proj-1', issue_title: 'Still open', application_window_closes_at: '2099-01-01T00:00:00Z' }),
      ],
    })

    renderWithProviders(
      <GrainHackEventDetailPage eventId="hack-6" eventName="Mixed" onBack={vi.fn()} onIssueClick={vi.fn()} />,
    )

    expect(await screen.findByText('1 open · 1 assigned')).toBeInTheDocument()
    expect(screen.getAllByText('Assigned')).toHaveLength(1)
  })
})
