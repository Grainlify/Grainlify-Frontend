import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { ApiError } from '../../../shared/api/apiError'
import { HackathonDetail } from './HackathonDetail'

const mockGetAdminHackathon = vi.fn()
const mockTransitionHackathon = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getAdminHackathon: (...args: unknown[]) => mockGetAdminHackathon(...args),
  transitionHackathon: (...args: unknown[]) => mockTransitionHackathon(...args),
}))

// Each of these fetches its own data independently of HackathonDetail's own
// phase/readiness logic (the thing this suite exercises) - stub them, same
// as Dashboard.test.tsx stubs unrelated child pages.
vi.mock('./HackathonForm', () => ({ HackathonForm: () => <div data-testid="hackathon-form" /> }))
vi.mock('./ApplicationsReview', () => ({ ApplicationsReview: () => <div data-testid="applications-review" /> }))
vi.mock('./HackathonConfigSettings', () => ({ HackathonConfigSettings: () => <div data-testid="config-settings" /> }))
vi.mock('./AuditLog', () => ({ AuditLog: () => <div data-testid="audit-log" /> }))
// These three and the payout panel were previously left real; their fetches
// hit this suite's client mock, failed, and (since they now say so) rendered
// role="alert" cards that have nothing to do with HackathonDetail.
vi.mock('./DrawResults', () => ({ DrawResults: () => <div data-testid="draw-results" /> }))
vi.mock('./VerdictsReview', () => ({ VerdictsReview: () => <div data-testid="verdicts-review" /> }))
vi.mock('./AppealsReview', () => ({ AppealsReview: () => <div data-testid="appeals-review" /> }))
vi.mock('./keeperhub/KeeperHubPayoutPanel', () => ({ KeeperHubPayoutPanel: () => <div data-testid="payout-panel" /> }))

const HACKATHON = {
  id: 'hack-1',
  name: 'GrainHack Spring 2026',
  phase: 'draft' as const,
  announced_at: null,
  application_period_start: null,
  application_period_end: null,
  issue_prep_start: null,
  starts_at: null,
  ends_at: null,
  merge_grace_period_hours: 48,
  contributor_prize_pool: null,
  maintainer_prize_pool: null,
  created_at: new Date().toISOString(),
}

describe('HackathonDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the current phase and a disabled transition button with blocking reasons when not ready', async () => {
    mockGetAdminHackathon.mockResolvedValue({
      hackathon: HACKATHON,
      next_phase: 'application_period',
      blocking_reasons: [{ field: 'announced_at', message: 'Set an announcement date first.' }],
    })

    renderWithProviders(<HackathonDetail hackathonId="hack-1" onBack={vi.fn()} />)

    expect(await screen.findByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Set an announcement date first.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /move to application period/i })).toBeDisabled()
  })

  it('enables the transition button once readiness has no blocking reasons, and calls the API on click', async () => {
    mockGetAdminHackathon.mockResolvedValue({
      hackathon: HACKATHON,
      next_phase: 'application_period',
      blocking_reasons: [],
    })
    mockTransitionHackathon.mockResolvedValue({ ok: true })
    const user = userEvent.setup()

    renderWithProviders(<HackathonDetail hackathonId="hack-1" onBack={vi.fn()} />)
    await screen.findByText('Draft')
    expect(screen.getByText('Ready to transition.')).toBeInTheDocument()

    const transitionButton = screen.getByRole('button', { name: /move to application period/i })
    expect(transitionButton).toBeEnabled()

    await user.click(transitionButton)

    await waitFor(() => expect(mockTransitionHackathon).toHaveBeenCalledWith('hack-1', 'application_period'))
  })

  it('hides the transition control entirely once there is no next phase (already live)', async () => {
    mockGetAdminHackathon.mockResolvedValue({
      hackathon: { ...HACKATHON, phase: 'live' },
      next_phase: '',
      blocking_reasons: [],
    })

    renderWithProviders(<HackathonDetail hackathonId="hack-1" onBack={vi.fn()} />)

    expect(await screen.findByText('Live')).toBeInTheDocument()
    expect(screen.queryByText(/move to/i)).not.toBeInTheDocument()
  })

  it('the back button calls onBack', async () => {
    mockGetAdminHackathon.mockResolvedValue({ hackathon: HACKATHON, next_phase: '', blocking_reasons: [] })
    const onBack = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<HackathonDetail hackathonId="hack-1" onBack={onBack} />)
    await screen.findByText('Draft')

    await user.click(screen.getByRole('button', { name: /back to hackathons/i }))
    expect(onBack).toHaveBeenCalled()
  })
})

// Used to toast and leave "Loading..." up forever (hackathon stayed null).
describe('HackathonDetail when the load fails', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('says it could not load, keeps the back button, and retries', async () => {
    mockGetAdminHackathon.mockRejectedValueOnce(new ApiError('hackathon_not_found', 404, { error: 'hackathon_not_found' }))
    mockGetAdminHackathon.mockResolvedValueOnce({ hackathon: HACKATHON, next_phase: '', blocking_reasons: [] })
    const user = userEvent.setup()

    renderWithProviders(<HackathonDetail hackathonId="hack-1" onBack={vi.fn()} />)

    expect(await screen.findByText("Couldn't load this hackathon")).toBeInTheDocument()
    expect(screen.getByText(/hackathon_not_found/)).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to hackathons/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Draft')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the details but flags them as stale when the reload after a transition fails', async () => {
    mockGetAdminHackathon.mockResolvedValueOnce({ hackathon: HACKATHON, next_phase: 'application_period', blocking_reasons: [] })
    mockGetAdminHackathon.mockRejectedValueOnce(new ApiError('internal_error', 500, { error: 'internal_error' }))
    mockTransitionHackathon.mockResolvedValue({ ok: true })
    const user = userEvent.setup()

    renderWithProviders(<HackathonDetail hackathonId="hack-1" onBack={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: /move to application period/i }))

    expect(await screen.findByText("Couldn't load the latest state of this hackathon")).toBeInTheDocument()
    expect(screen.getByText('GrainHack Spring 2026')).toBeInTheDocument()
  })
})
