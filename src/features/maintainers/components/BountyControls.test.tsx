import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BountyControls } from './BountyControls'
import { maintainerRunDraw, maintainerSetDeadline, maintainerUnassign, type MaintainerBountyView } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/client')>()
  return { ...real, maintainerRunDraw: vi.fn(), maintainerUnassign: vi.fn(), maintainerSetDeadline: vi.fn() }
})

const view = (o: Partial<MaintainerBountyView> = {}): MaintainerBountyView => ({
  bountyId: 'b1', repo: 'Grainlify/sandbox', issueNumber: 7, bountyStatus: 'posted', awaitingRedraw: false, assignment: null,
  windowOpen: false, applicationsCloseAt: null, canAssign: false, assignmentIsByDraw: true, applicantBucket: null,
  applicantCount: 2, applications: [], draw: null, ...o,
})
const held = (status = 'active') =>
  view({ assignment: { githubLogin: 'jotel-dev', status, staleAt: '2026-10-03T01:17:12.000Z', prNumber: status === 'pr_submitted' ? 37 : null } })

beforeEach(() => vi.resetAllMocks())

describe('a bounty somebody holds', () => {
  it('will not unassign without a reason, because the contributor is shown it', async () => {
    renderWithProviders(<BountyControls view={held()} onChanged={() => {}} />)
    expect(screen.getByRole('button', { name: 'Unassign' })).toBeDisabled()
  })

  it('says plainly that nothing is counted against them, and that nobody is drawn until you redraw', () => {
    renderWithProviders(<BountyControls view={held()} onChanged={() => {}} />)
    expect(screen.getByText(/no abandon is recorded and their odds are untouched/i)).toBeInTheDocument()
    expect(screen.getByText(/Nobody is drawn until you run the draw again/i)).toBeInTheDocument()
  })

  it('sends the reason, reports what the contributor was told, and reloads', async () => {
    vi.mocked(maintainerUnassign).mockResolvedValue({ ok: true, contributor: 'jotel-dev', reason: 'Our decision.' })
    const onChanged = vi.fn()
    renderWithProviders(<BountyControls view={held()} onChanged={onChanged} />)
    await userEvent.type(screen.getByLabelText('Reason for unassigning'), 'Our decision.')
    await userEvent.click(screen.getByRole('button', { name: 'Unassign' }))
    expect(maintainerUnassign).toHaveBeenCalledWith('b1', 'Our decision.')
    expect(await screen.findByRole('status')).toHaveTextContent(/Unassigned jotel-dev/)
    expect(onChanged).toHaveBeenCalled()
  })

  it('will not move a deadline without both a date and a reason', async () => {
    renderWithProviders(<BountyControls view={held()} onChanged={() => {}} />)
    const move = screen.getByRole('button', { name: 'Move the deadline' })
    expect(move).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Reason for changing the deadline'), 'More time.')
    expect(move).toBeDisabled()
  })

  it('reports the move in the same words a contributor reads', async () => {
    vi.mocked(maintainerSetDeadline).mockResolvedValue({ ok: true, previousAt: '2026-10-03T01:17:12Z', staleAt: '2026-10-06T01:17:12Z' })
    renderWithProviders(<BountyControls view={held()} onChanged={() => {}} />)
    await userEvent.type(screen.getByLabelText('New pull-request deadline'), '2026-10-06T01:17')
    await userEvent.type(screen.getByLabelText('Reason for changing the deadline'), 'More time.')
    await userEvent.click(screen.getByRole('button', { name: 'Move the deadline' }))
    expect(await screen.findByRole('status')).toHaveTextContent('3 October 2026 at 01:17 UTC to 6 October 2026 at 01:17 UTC')
  })

  it('offers no draw while it is held', () => {
    renderWithProviders(<BountyControls view={held()} onChanged={() => {}} />)
    expect(screen.queryByRole('button', { name: /run the draw|redraw/i })).not.toBeInTheDocument()
  })
})

describe('a bounty with a pull request open', () => {
  it('offers neither unassign nor a deadline, and says why', () => {
    renderWithProviders(<BountyControls view={held('pr_submitted')} onChanged={() => {}} />)
    expect(screen.getByText(/pull request open/i)).toBeInTheDocument()
    expect(screen.getByText(/deadline no longer applies/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unassign' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move the deadline' })).not.toBeInTheDocument()
  })
})

describe('a bounty nobody holds', () => {
  it('asks for confirmation before assigning anyone, and can be cancelled', async () => {
    renderWithProviders(<BountyControls view={view()} onChanged={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Run the draw now' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/One applicant will be assigned/)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(maintainerRunDraw).not.toHaveBeenCalled()
  })

  it('says it is waiting for you after an unassign, and calls it a redraw', () => {
    renderWithProviders(<BountyControls view={view({ awaitingRedraw: true })} onChanged={() => {}} />)
    expect(screen.getByText('Waiting for you to redraw')).toBeInTheDocument()
    expect(screen.getByText(/skipped this once/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redraw now' })).toBeInTheDocument()
  })

  it('sends a chosen deadline with the draw, and none when left empty', async () => {
    vi.mocked(maintainerRunDraw).mockResolvedValue({ drawId: 'd', seed: 1, simulation: true, triggeredBy: 'm', poolSize: 0, pool: [], winner: null, firstComeFallback: false, noWinnerReason: null, assignmentId: null, staleAt: null })
    renderWithProviders(<BountyControls view={view()} onChanged={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Simulate' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, simulate' }))
    expect(maintainerRunDraw).toHaveBeenLastCalledWith('b1', true, undefined)
    await userEvent.type(screen.getByLabelText('Hours until the pull-request deadline'), '48')
    await userEvent.click(screen.getByRole('button', { name: 'Simulate' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, simulate' }))
    expect(maintainerRunDraw).toHaveBeenLastCalledWith('b1', true, 48)
  })

  it('offers no draw while applications are still open', () => {
    renderWithProviders(<BountyControls view={view({ windowOpen: true })} onChanged={() => {}} />)
    expect(screen.queryByRole('button', { name: /run the draw/i })).not.toBeInTheDocument()
  })
})

it('shows nothing for a bounty that is closed and held by nobody', () => {
  const { container } = renderWithProviders(<BountyControls view={view({ bountyStatus: 'cancelled' })} onChanged={() => {}} />)
  expect(container.textContent).toBe('')
})
