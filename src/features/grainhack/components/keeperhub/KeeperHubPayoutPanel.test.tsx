import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { ApiError } from '../../../../shared/api/apiError'
import { PAYOUT_COMPUTATION, allPaid, awaiting, blocked, notConfigured, resumable, runFailed, settlementPreview } from './fixtures'

const h = vi.hoisted(() => ({
  getKeeperHubRun: vi.fn(),
  releaseKeeperHubRun: vi.fn(),
  readKeeperHubResults: vi.fn(),
  resolveKeeperHubLeg: vi.fn(),
  getHackathonSettlementPreview: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

vi.mock('sonner', () => ({ toast: h.toast }))
vi.mock('../../../../shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getKeeperHubRun: h.getKeeperHubRun,
  releaseKeeperHubRun: h.releaseKeeperHubRun,
  readKeeperHubResults: h.readKeeperHubResults,
  resolveKeeperHubLeg: h.resolveKeeperHubLeg,
  getHackathonSettlementPreview: h.getHackathonSettlementPreview,
}))

import { KeeperHubPayoutPanel } from './KeeperHubPayoutPanel'

const panel = () => screen.getByTestId('keeperhub-panel')

async function renderWith(v: unknown, phase?: string) {
  h.getKeeperHubRun.mockResolvedValue(v)
  renderWithProviders(<KeeperHubPayoutPanel hackathonId="h-1" phase={phase} />)
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

  it('also states testnet or mainnet in the resend confirmation', async () => {
    await renderWith(resumable())
    fireEvent.click(screen.getByRole('button', { name: /Send 1 unpaid leg/ }))
    expect(screen.getByTestId('keeperhub-confirm')).toHaveTextContent('the run pays on base-sepolia (testnet, chain 84532)')
  })
})

describe('KeeperHubPayoutPanel: starting the first payout', () => {
  const startBox = () => screen.getByTestId('keeperhub-start-box')
  const startButton = () => within(startBox()).getByRole('button', { name: 'Start payout' })

  async function renderNoRun(phase: string, preview: unknown = settlementPreview()) {
    h.getHackathonSettlementPreview.mockResolvedValue(preview)
    await renderWith(null, phase)
  }

  async function openConfirm() {
    fireEvent.change(screen.getByLabelText(/Payout computation id/), { target: { value: PAYOUT_COMPUTATION } })
    fireEvent.click(startButton())
    return screen.getByTestId('keeperhub-start-confirm')
  }

  it('offers no start before the event is settled, and says which phase it is in', async () => {
    await renderNoRun('results_published')
    expect(panel().dataset.state).toBe('no-run')
    expect(panel()).toHaveTextContent('A payout can start once the event is settled; it is Results published now.')
    expect(screen.queryByTestId('keeperhub-start-box')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start payout/ })).not.toBeInTheDocument()
    expect(h.getHackathonSettlementPreview).not.toHaveBeenCalled()
  })

  it('settled: reads the preview and needs a well-formed computation id', async () => {
    await renderNoRun('settled')
    await waitFor(() => expect(startBox()).toBeInTheDocument())
    expect(h.getHackathonSettlementPreview).toHaveBeenCalledWith('h-1', 'base-sepolia')
    expect(screen.getByTestId('keeperhub-start-summary')).toHaveTextContent(
      'Contributor pool · 3.750001 USDC · 3 people to pay, 1 rounded to nothing',
    )
    expect(within(startBox()).getByLabelText(/Base Sepolia · testnet/)).toBeChecked()
    expect(startButton()).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Payout computation id/), { target: { value: 'pr-1' } })
    expect(screen.getByTestId('keeperhub-start-id-hint')).toHaveTextContent("That isn't an id")
    expect(startButton()).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Payout computation id/), { target: { value: PAYOUT_COMPUTATION } })
    expect(screen.queryByTestId('keeperhub-start-id-hint')).not.toBeInTheDocument()
    expect(startButton()).toBeEnabled()
  })

  it('confirms exactly what goes out, on testnet, before sending', async () => {
    h.releaseKeeperHubRun.mockResolvedValue({
      release: { run_id: 'run-1', planned: true, attempt_id: 'x', execution_id: 'y', dispatched_leg_ids: ['l1', 'l2'], exclusions: [{ user_id: 'u3', amount_minor: '750000', reason: 'no_address' }], ack_status: 'running' },
      note: '',
    })
    await renderNoRun('settled')
    await waitFor(() => expect(startBox()).toBeInTheDocument())
    const dialog = await openConfirm()
    expect(h.releaseKeeperHubRun).not.toHaveBeenCalled()

    expect(dialog).toHaveTextContent('Start the payout on Base Sepolia (testnet)?')
    expect(screen.getByTestId('keeperhub-start-network')).toHaveTextContent(
      'Contributor pool · pays on Base Sepolia (testnet, chain 84532) · test USDC, no real value',
    )
    const lines = within(screen.getByTestId('keeperhub-start-lines')).getAllByRole('listitem')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toHaveTextContent('user 0b6e1d1c-1111-4a00-9000-00000000000a')
    expect(lines[0]).toHaveTextContent('1.000001 USDC')
    expect(lines[2]).toHaveTextContent('0.750000 USDC')
    expect(dialog).toHaveTextContent('Anyone without a linked GitHub account, a verified identity, or a verified address on Base Sepolia is excluded')
    expect(dialog).toHaveTextContent(`Computation ${PAYOUT_COMPUTATION}`)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Start payout on Base Sepolia' }))
    await waitFor(() =>
      expect(h.releaseKeeperHubRun).toHaveBeenCalledWith('h-1', { payoutRunId: PAYOUT_COMPUTATION, chainId: 'base-sepolia', pool: 'contributor' }),
    )
    await waitFor(() => expect(h.getKeeperHubRun).toHaveBeenCalledTimes(2))
    expect(h.toast.success.mock.calls[0][0]).toBe(
      'KeeperHub accepted 2 legs on Base Sepolia (testnet). 1 person was excluded and not sent. Accepted is not paid: read the results once the execution finishes.',
    )
    expect(screen.queryByTestId('keeperhub-start-confirm')).not.toBeInTheDocument()
  })

  it('says mainnet and real USDC when Base is chosen', async () => {
    h.releaseKeeperHubRun.mockResolvedValue({ release: { attempt_id: 'x', execution_id: 'y', dispatched_leg_ids: ['l1'], ack_status: 'running' }, note: '' })
    await renderNoRun('settled')
    await waitFor(() => expect(startBox()).toBeInTheDocument())
    fireEvent.click(within(startBox()).getByLabelText(/Base · mainnet/))
    expect(startBox()).toHaveTextContent('Mainnet sends real USDC.')
    const dialog = await openConfirm()
    expect(dialog).toHaveTextContent('Start the payout on Base (mainnet)?')
    expect(dialog).toHaveTextContent('pays on Base (mainnet, chain 8453) · real USDC')
    expect(dialog).not.toHaveTextContent('testnet')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start payout on Base' }))
    await waitFor(() => expect(h.releaseKeeperHubRun).toHaveBeenCalledWith('h-1', { payoutRunId: PAYOUT_COMPUTATION, chainId: 'base', pool: 'contributor' }))
  })

  it('cancelling the confirmation sends nothing', async () => {
    await renderNoRun('settled')
    await waitFor(() => expect(startBox()).toBeInTheDocument())
    const dialog = await openConfirm()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByTestId('keeperhub-start-confirm')).not.toBeInTheDocument()
    expect(h.releaseKeeperHubRun).not.toHaveBeenCalled()
  })

  it.each([
    ['payout_not_releasable', 409, 'hackathon: payout not releasable: this hackathon is in shadow mode, which computes payouts but pays nothing', /Turn judging_shadow_mode off/],
    ['payout_run_not_current', 409, 'asked to pay x, current is y', /isn't this event's current payout computation/],
    ['preflight_would_revert', 409, 'leg would revert', /simulation says a transfer would fail/],
    ['nothing_unpaid', 409, 'no pending or failed legs', /Everyone was excluded/],
    ['keeperhub_not_configured', 503, 'KEEPERHUB_WEBHOOK_KEY is not set', /isn't configured on this server/],
  ])('a refused start (%s) says why, inline and as a toast, and re-reads the run', async (code, status, detail, sentence) => {
    h.releaseKeeperHubRun.mockRejectedValue(new ApiError(code, status, { error: code, detail }))
    await renderNoRun('settled')
    await waitFor(() => expect(startBox()).toBeInTheDocument())
    const dialog = await openConfirm()
    fireEvent.click(within(dialog).getByRole('button', { name: /Start payout on/ }))
    await waitFor(() => expect(h.toast.error).toHaveBeenCalled())
    expect(h.toast.error.mock.calls[0][0]).toMatch(sentence)
    await waitFor(() => expect(h.getKeeperHubRun).toHaveBeenCalledTimes(2))
    const inline = screen.getByTestId('keeperhub-start-error')
    expect(inline).toHaveTextContent(sentence)
    expect(inline).toHaveTextContent(code)
  })

  it('a start that planned a run shows that run after the reload', async () => {
    h.releaseKeeperHubRun.mockRejectedValue(new ApiError('preflight_would_revert', 409, { error: 'preflight_would_revert' }))
    await renderNoRun('settled')
    await waitFor(() => expect(startBox()).toBeInTheDocument())
    h.getKeeperHubRun.mockResolvedValue(resumable())
    const dialog = await openConfirm()
    fireEvent.click(within(dialog).getByRole('button', { name: /Start payout on/ }))
    await waitFor(() => expect(panel().dataset.state).toBe('allowed'))
    expect(screen.queryByTestId('keeperhub-start-box')).not.toBeInTheDocument()
  })

  it.each([
    ['nothing to settle', { nothing_to_settle: true, hackathon_id: 'h-1', pool: 'contributor', reason: 'nothing to settle: no submission carried a positive weight' }, 'There is nothing to pay for this event'],
    ['already settled on Aptos', settlementPreview({ already_settled: true, settlement_id: 's-9' }), 'already settled on the Aptos rail'],
    ['amounts that miss the pool', settlementPreview({ sums_to_pool: false }), "The computed amounts don't add up to the pool"],
  ])('settled but %s: explains, and offers no start', async (_name, preview, text) => {
    await renderNoRun('settled', preview)
    await waitFor(() => expect(panel()).toHaveTextContent(text))
    expect(screen.queryByRole('button', { name: /Start payout/ })).not.toBeInTheDocument()
  })

  it('a failed preview says a payout cannot be started from here', async () => {
    h.getHackathonSettlementPreview.mockRejectedValue(new ApiError('boom', 422, { error: 'settlement: allocation mismatch' }))
    await renderWith(null, 'settled')
    await waitFor(() => expect(panel()).toHaveTextContent("couldn't be read, so a payout can't be started from here"))
    expect(panel()).toHaveTextContent('settlement: allocation mismatch')
    expect(screen.queryByRole('button', { name: /Start payout/ })).not.toBeInTheDocument()
  })
})
