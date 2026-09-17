import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { ApiError } from '../../../../shared/api/apiError'
import { allPaid, awaiting, blocked, notConfigured, resumable, runFailed } from './fixtures'

const h = vi.hoisted(() => ({
  getKeeperHubRun: vi.fn(),
  releaseKeeperHubRun: vi.fn(),
  readKeeperHubResults: vi.fn(),
  resolveKeeperHubLeg: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

vi.mock('sonner', () => ({ toast: h.toast }))
vi.mock('../../../../shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getKeeperHubRun: h.getKeeperHubRun,
  releaseKeeperHubRun: h.releaseKeeperHubRun,
  readKeeperHubResults: h.readKeeperHubResults,
  resolveKeeperHubLeg: h.resolveKeeperHubLeg,
}))

import { KeeperHubPayoutPanel } from './KeeperHubPayoutPanel'

const panel = () => screen.getByTestId('keeperhub-panel')

async function renderWith(v: unknown) {
  h.getKeeperHubRun.mockResolvedValue(v)
  renderWithProviders(<KeeperHubPayoutPanel hackathonId="h-1" />)
  await waitFor(() => expect(panel().dataset.state).not.toBe('loading'))
}

beforeEach(() => vi.clearAllMocks())

describe('KeeperHubPayoutPanel', () => {
  it('shows five per-status figures and no total anywhere', async () => {
    await renderWith(blocked())
    const tiles = within(screen.getByTestId('keeperhub-tiles')).getAllByRole('listitem')
    expect(tiles.map((t) => t.dataset.status)).toEqual(['confirmed', 'unknown', 'failed', 'dispatched', 'pending'])
    expect(tiles[0]).toHaveTextContent('Paid2')
    expect(tiles[0]).toHaveTextContent('1.500001 USDC')
    expect(tiles[1]).toHaveTextContent('2.000000 USDC')
    const text = panel().textContent ?? ''
    // Paid + may-have-paid + failed would be 4.250001; neither it nor any
    // "total/remaining" wording may appear.
    expect(text).not.toMatch(/4\.250001|total paid|remaining|of 4\.500001/i)
    expect(text).toContain('Contributor pool · 4.500001 USDC · 4 legs, 1 excluded')
  })

  it('says plainly when the figures do not add up to the pool, and why', async () => {
    await renderWith(blocked())
    const note = screen.getByTestId('keeperhub-nonclosure')
    expect(note).toHaveTextContent("These don't add up to the pool, and aren't meant to.")
    expect(note).toHaveTextContent('2.000000 USDC sits in a leg that may or may not have left the wallet')
    expect(note).toHaveTextContent('0.250000 USDC was excluded before anything was sent')
    expect(note).toHaveTextContent("How much has been paid can't be settled until @sample-b's leg is resolved.")
  })

  it('shows the plain caption when nothing is unknown', async () => {
    await renderWith(resumable())
    expect(screen.queryByTestId('keeperhub-nonclosure')).not.toBeInTheDocument()
    expect(panel()).toHaveTextContent('Counted from the legs below.')
  })

  it('shows the chain once, on the run, and never on a leg', async () => {
    await renderWith(resumable())
    expect(screen.getByTestId('keeperhub-chain-chip')).toHaveTextContent('Run pays on base-sepolia · chain 84532')
    for (const leg of screen.getAllByTestId('keeperhub-leg')) {
      expect(leg.textContent).not.toMatch(/84532|base-sepolia/)
    }
    expect(panel().textContent?.match(/84532/g)).toHaveLength(1)
  })

  it('resumable: sends only the sendable legs after a confirmation', async () => {
    h.releaseKeeperHubRun.mockResolvedValue({ release: { attempt_id: 'x', execution_id: 'y', dispatched_leg_ids: ['b'], ack_status: 'running' }, note: '' })
    await renderWith(resumable())
    expect(screen.getByTestId('keeperhub-state-chip')).toHaveTextContent('1 leg ready to resend')
    fireEvent.click(screen.getByRole('button', { name: /Send 1 unpaid leg · 2\.000000 USDC/ }))
    expect(h.releaseKeeperHubRun).not.toHaveBeenCalled()

    const dialog = screen.getByTestId('keeperhub-confirm')
    expect(dialog).toHaveTextContent('Send 1 unpaid leg?')
    expect(dialog).toHaveTextContent('@sample-a, @sample-c')
    expect(dialog).toHaveTextContent('Already paid · never sent again')
    expect(dialog).toHaveTextContent('KeeperHub accepting it is not payment')
    fireEvent.click(within(dialog).getByRole('button', { name: /Send 1 leg · 2\.000000 USDC/ }))

    await waitFor(() => expect(h.releaseKeeperHubRun).toHaveBeenCalledWith('h-1', { payoutRunId: 'pr-1', chainId: 'base-sepolia', pool: 'contributor' }))
    await waitFor(() => expect(h.getKeeperHubRun).toHaveBeenCalledTimes(2))
    expect(h.toast.success.mock.calls[0][0]).toMatch(/Accepted is not paid/)
  })

  it('reloads and says the legs may have paid when the dispatch outcome is unknown', async () => {
    h.releaseKeeperHubRun.mockRejectedValue(new ApiError('dispatch_outcome_unknown', 502, { error: 'dispatch_outcome_unknown' }))
    await renderWith(resumable())
    fireEvent.click(screen.getByRole('button', { name: /Send 1 unpaid leg/ }))
    fireEvent.click(within(screen.getByTestId('keeperhub-confirm')).getByRole('button', { name: /Send 1 leg/ }))
    await waitFor(() => expect(h.toast.error).toHaveBeenCalled())
    expect(h.toast.error.mock.calls[0][0]).toMatch(/may have paid/)
    await waitFor(() => expect(h.getKeeperHubRun).toHaveBeenCalledTimes(2))
  })

  it('blocked: no send, and a resolve form that needs its fields', async () => {
    h.resolveKeeperHubLeg.mockResolvedValue({ leg_id: 'b', status: 'confirmed' })
    await renderWith(blocked())
    const box = screen.getByTestId('keeperhub-send-box')
    expect(box).toHaveTextContent('Nothing can be sent while a leg may have paid')
    expect(box).toHaveTextContent('resume.reason unreconciled_legs')
    expect(within(box).getByRole('button', { name: 'Send unpaid legs' })).toBeDisabled()
    expect(panel()).toHaveTextContent('Failed · resendable once the send unlocks (1)')

    fireEvent.click(screen.getByRole('button', { name: 'Resolve this leg' }))
    const form = screen.getByTestId('keeperhub-resolve-form')
    expect(screen.getByTestId('keeperhub-resolve-where')).toHaveTextContent(
      'Look for a USDC transfer from the payout wallet 0xE6e5e247ce27A43F724675DD679DC7a4a1896CA6 to 0x0fF6…0fEE after attempt 1 was sent.',
    )
    const record = within(form).getByRole('button', { name: 'Record resolution' })
    expect(record).toBeDisabled()

    fireEvent.click(within(form).getByLabelText(/It paid/))
    expect(screen.getByTestId('keeperhub-resolve-hint')).toHaveTextContent('Add the transaction hash and what you checked to record it as paid.')
    fireEvent.change(within(form).getByLabelText(/Transaction hash/), { target: { value: ' 0xabc ' } })
    expect(record).toBeDisabled()
    fireEvent.change(within(form).getByLabelText(/What you checked/), { target: { value: 'Transfer in block 1' } })
    expect(record).toBeEnabled()
    fireEvent.click(record)
    await waitFor(() => expect(h.resolveKeeperHubLeg).toHaveBeenCalledWith('h-1', 'b', { status: 'confirmed', txHash: '0xabc', note: 'Transfer in block 1' }))
  })

  it('says the payout wallet is not configured rather than leaving a gap', async () => {
    const v = blocked()
    v.payout_wallet = { address: null, note: '' }
    await renderWith(v)
    fireEvent.click(screen.getByRole('button', { name: 'Resolve this leg' }))
    expect(screen.getByTestId('keeperhub-resolve-where')).toHaveTextContent(
      "from the payout wallet (its address isn't configured on this server) to 0x0fF6…0fEE",
    )
  })

  it('resolving as not paid needs no transaction hash', async () => {
    h.resolveKeeperHubLeg.mockResolvedValue({})
    await renderWith(blocked())
    fireEvent.click(screen.getByRole('button', { name: 'Resolve this leg' }))
    const form = screen.getByTestId('keeperhub-resolve-form')
    fireEvent.click(within(form).getByLabelText(/It did not pay/))
    fireEvent.change(within(form).getByLabelText(/What you checked/), { target: { value: 'No transfer to this address' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Record resolution' }))
    await waitFor(() => expect(h.resolveKeeperHubLeg).toHaveBeenCalledWith('h-1', 'b', { status: 'failed', txHash: '', note: 'No transfer to this address' }))
  })

  it('not configured: every leg shown, every action disabled with a reason, no error page', async () => {
    await renderWith(notConfigured())
    expect(panel().dataset.state).toBe('not_configured')
    expect(screen.getByTestId('keeperhub-state-chip')).toHaveTextContent('Read-only: KeeperHub not configured')
    expect(screen.getAllByTestId('keeperhub-leg')).toHaveLength(4)
    expect(screen.getByTestId('keeperhub-send-box')).toHaveTextContent("KeeperHub isn't configured on this server")
    expect(screen.getByRole('button', { name: 'Send unpaid legs' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Resolve this leg' })).toBeDisabled()
    expect(panel()).toHaveTextContent('Resolving is unavailable until KeeperHub is configured.')
    expect(panel()).toHaveTextContent('No linked GitHub account')
  })

  it('awaiting result: reads the waiting attempt back', async () => {
    h.readKeeperHubResults.mockResolvedValue({ intake: { finished: true, already_reconciled: false } })
    await renderWith(awaiting())
    const box = screen.getByTestId('keeperhub-send-box')
    expect(box).toHaveTextContent('KeeperHub accepted attempt 2: results not read yet')
    fireEvent.click(within(box).getByRole('button', { name: 'Read results' }))
    await waitFor(() => expect(h.readKeeperHubResults).toHaveBeenCalledWith('h-1', '6c1d1c7e-6d0a-4d7e-9a53-0b8e7f5b0a02'))
  })

  it('a still-running execution records nothing and says so', async () => {
    h.readKeeperHubResults.mockResolvedValue({ intake: { finished: false, already_reconciled: false } })
    await renderWith(awaiting())
    fireEvent.click(screen.getByRole('button', { name: 'Read results' }))
    await waitFor(() => expect(h.toast.message).toHaveBeenCalledWith(expect.stringMatching(/Nothing was recorded/)))
  })

  it('run failed: says it cannot be reopened, with the server detail', async () => {
    await renderWith(runFailed())
    const box = screen.getByTestId('keeperhub-send-box')
    expect(box).toHaveTextContent('This run has failed and needs a person before anything more is sent')
    expect(box).toHaveTextContent('this run pays on chain 84532')
    expect(box).toHaveTextContent('There is no way to reopen a failed run yet.')
  })

  it('all paid: nothing to send', async () => {
    await renderWith(allPaid())
    expect(screen.getByTestId('keeperhub-send-box')).toHaveTextContent('Every leg is paid. Nothing is left to send.')
    expect(screen.queryByRole('button', { name: /Send/ })).not.toBeInTheDocument()
  })

  it('exclusions are shown apart from legs and never counted as one', async () => {
    await renderWith(resumable())
    const ex = screen.getByTestId('keeperhub-exclusion')
    expect(ex).toHaveTextContent('@sample-d')
    expect(ex).toHaveTextContent('No verified Base payout address when the run was prepared')
    expect(panel()).toHaveTextContent('Not in this run · not a leg, never sent (1)')
  })

  it('no run yet is a quiet state, and a failed load is not', async () => {
    await renderWith(null)
    expect(panel().dataset.state).toBe('no-run')

    h.getKeeperHubRun.mockRejectedValue(new ApiError('database_not_configured', 503, { error: 'database_not_configured' }))
    renderWithProviders(<KeeperHubPayoutPanel hackathonId="h-2" />)
    await waitFor(() => expect(screen.getAllByTestId('keeperhub-panel')[1].dataset.state).toBe('load-failed'))
  })

  it('send history names attempts in order and flags legs without a result', async () => {
    await renderWith(blocked())
    const [a1] = screen.getAllByTestId('keeperhub-attempt')
    expect(a1).toHaveTextContent('Attempt 1')
    expect(a1).toHaveTextContent('Read · 1 leg without result')
    expect(a1).toHaveTextContent('execution kbzz0fkbmvbuq87wxsnsk')
  })
})
