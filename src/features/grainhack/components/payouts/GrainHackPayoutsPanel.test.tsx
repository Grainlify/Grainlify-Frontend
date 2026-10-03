import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { ApiError } from '../../../../shared/api/apiError'
import { adminView, agentPayouts, COMPUTATION, HACKATHON_ID, issuedState, noStatementState, SIG, STATEMENT_1, STATEMENT_2 } from './fixtures'

const h = vi.hoisted(() => ({
  getResultsStatement: vi.fn(),
  issueResultsStatement: vi.fn(),
  getGrainHackPayouts: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

vi.mock('sonner', () => ({ toast: h.toast }))
vi.mock('../../../../shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getResultsStatement: h.getResultsStatement,
  issueResultsStatement: h.issueResultsStatement,
}))
vi.mock('../../../../shared/api/bountyAgent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getGrainHackPayouts: h.getGrainHackPayouts,
}))

import { GrainHackPayoutsPanel } from './GrainHackPayoutsPanel'

const panel = () => screen.getByTestId('grainhack-payouts-panel')

async function renderWith(state: unknown, agent: unknown = agentPayouts()) {
  h.getResultsStatement.mockResolvedValue(state)
  if (agent instanceof Error) h.getGrainHackPayouts.mockRejectedValue(agent)
  else h.getGrainHackPayouts.mockResolvedValue(agent)
  renderWithProviders(<GrainHackPayoutsPanel hackathonId={HACKATHON_ID} />)
  await waitFor(() => expect(panel().dataset.state).not.toBe('loading'))
}

beforeEach(() => vi.clearAllMocks())

describe('GrainHackPayoutsPanel', () => {
  it('offers to issue a statement when none exists, and never asks the agent', async () => {
    await renderWith(noStatementState)
    expect(panel().dataset.state).toBe('no-statement')
    expect(screen.getByTestId('grainhack-issue-box')).toHaveTextContent('Issuing pays nobody.')
    expect(screen.queryByTestId('grainhack-no-computation')).not.toBeInTheDocument()
    expect(h.getGrainHackPayouts).not.toHaveBeenCalled()
  })

  it('says so when the event has nothing computed yet', async () => {
    await renderWith({ ...noStatementState, currentPayoutRunId: null })
    expect(screen.getByTestId('grainhack-no-computation')).toHaveTextContent('no payout computation yet')
  })

  it('issues only after the confirmation, for the computation on screen, then reloads', async () => {
    await renderWith(noStatementState)
    h.issueResultsStatement.mockResolvedValue(issuedState())
    h.getResultsStatement.mockResolvedValue(issuedState())
    fireEvent.click(screen.getByRole('button', { name: /Issue statement/ }))
    expect(h.issueResultsStatement).not.toHaveBeenCalled()
    const dialog = screen.getByTestId('grainhack-issue-confirm')
    expect(dialog).toHaveTextContent('Issue the results statement?')
    fireEvent.click(within(dialog).getByRole('button', { name: /Issue statement/ }))
    await waitFor(() => expect(h.issueResultsStatement).toHaveBeenCalledWith(HACKATHON_ID, { payoutRunId: COMPUTATION }))
    await waitFor(() => expect(panel().dataset.state).toBe('issued'))
    expect(h.toast.success).toHaveBeenCalledWith(expect.stringContaining('Nobody is paid until an approver runs approve-event'))
  })

  it('says why the backend refused', async () => {
    await renderWith(noStatementState)
    h.issueResultsStatement.mockRejectedValue(new ApiError('x', 409, { error: 'keeperhub_run_exists', detail: 'Run 1 is on base-sepolia.' }))
    fireEvent.click(screen.getByRole('button', { name: /Issue statement/ }))
    fireEvent.click(within(screen.getByTestId('grainhack-issue-confirm')).getByRole('button', { name: /Issue statement/ }))
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith(expect.stringMatching(/One rail per pool\. Run 1 is on base-sepolia\.$/)))
  })

  it('shows the statement: status, version, supersedes, chain, and the admin who issued it', async () => {
    await renderWith(issuedState(adminView({ statement_id: STATEMENT_2, supersedes: STATEMENT_1 })))
    expect(screen.getByTestId('grainhack-statement-status')).toHaveTextContent('Issued · signed · immutable')
    expect(screen.getByTestId('grainhack-statement-version')).toHaveTextContent('v1 · grainhack_results')
    expect(screen.getByTestId('grainhack-statement-supersedes')).toHaveTextContent('5b0e9f3a…')
    expect(screen.getByTestId('grainhack-statement-chain')).toHaveTextContent('Statement 2 of 2')
    // issued_by is a user id, not a login.
    expect(screen.getByTestId('grainhack-statement-issued')).toHaveTextContent('by admin a0d1e2f3…')
    expect(screen.queryByTestId('grainhack-agent-note')).not.toBeInTheDocument()
  })

  it("shows each winner's status, held for KYC included, with the backend's transaction link for the paid one", async () => {
    await renderWith(issuedState())
    const winners = screen.getAllByTestId('grainhack-winner')
    expect(winners.map((w) => w.dataset.status)).toEqual(['sending', 'waiting', 'waiting', 'held_kyc', 'paid'])
    expect(winners[0]).toHaveTextContent('Sending')
    expect(winners[0]).toHaveTextContent('Never retried automatically')
    expect(winners[3]).toHaveTextContent('Held for KYC50.000000 test USDC@sample-cy')
    const tx = within(winners[4]).getByRole('link')
    expect(tx).toHaveTextContent('Solana Explorer')
    expect(tx).toHaveAttribute('href', `https://explorer.solana.com/tx/${SIG}?cluster=devnet`)
  })

  it('marks a held winner whose KYC has cleared, and offers the superseding statement the backend says is available', async () => {
    const lines = adminView().lines.map((l) => (l.login === 'sample-cy' ? { ...l, kyc_verified_now: true } : l))
    await renderWith(issuedState(adminView({ lines, supersede_available: true })))
    expect(screen.getAllByTestId('grainhack-winner').find((w) => w.textContent?.includes('@sample-cy'))!.dataset.status).toBe('held_kyc_cleared')
    const box = screen.getByTestId('grainhack-supersede')
    expect(box.dataset.available).toBe('yes')
    fireEvent.click(within(box).getByRole('button', { name: 'Issue a superseding statement' }))
    expect(screen.getByTestId('grainhack-issue-confirm')).toHaveTextContent('Anyone already paid under an earlier statement stays paid')
  })

  it('warns when a payable winner has lost their KYC since the statement', async () => {
    const lines = adminView().lines.map((l) => (l.login === 'sample-bo' ? { ...l, kyc_verified_now: false } : l))
    await renderWith(issuedState(adminView({ lines, supersede_available: true })))
    expect(screen.getByTestId('grainhack-kyc-lapsed')).toHaveTextContent('no longer verified')
  })

  it('totals the pool honestly: paid, sending and not paid yet', async () => {
    await renderWith(issuedState())
    const totals = screen.getByTestId('grainhack-totals')
    expect(within(totals).getAllByRole('listitem').map((li) => li.dataset.total)).toEqual(['pool', 'paid', 'sending', 'outstanding'])
    expect(totals).toHaveTextContent('250.000000 test USDC')
    expect(totals).toHaveTextContent('Paid100.000000 test USDC')
    expect(totals).toHaveTextContent('Sending12.500000 test USDC')
    expect(totals).toHaveTextContent('Not paid yet137.500000 test USDC')
    expect(screen.getByTestId('grainhack-sums')).toHaveTextContent('adds up to the pool exactly')
    expect(screen.getByTestId('grainhack-state-chip')).toHaveTextContent('1 of 5 paid')
  })

  it('gives the exact approve-event command to copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    await renderWith(issuedState())
    expect(screen.getByTestId('grainhack-approve')).toHaveTextContent('2 payable winners are waiting for a wallet or approval')
    expect(screen.getByTestId('grainhack-approve-command')).toHaveTextContent(`pnpm approve-event ${HACKATHON_ID}`)
    fireEvent.click(screen.getByRole('button', { name: 'Copy the approve-event command' }))
    expect(writeText).toHaveBeenCalledWith(`pnpm approve-event ${HACKATHON_ID}`)
  })

  it('explains superseding while anyone is held, without offering it before anything has changed', async () => {
    await renderWith(issuedState())
    const box = screen.getByTestId('grainhack-supersede')
    expect(box.dataset.available).toBe('no')
    expect(within(box).queryByRole('button')).not.toBeInTheDocument()
  })

  it('labels mainnet as real USDC', async () => {
    await renderWith(issuedState(adminView({ network: 'solana-mainnet' })), agentPayouts({ network: 'solana-mainnet', test: false }))
    expect(screen.getByTestId('grainhack-network-chip')).toHaveTextContent('Solana mainnet · real USDC')
    expect(screen.getByTestId('grainhack-totals')).not.toHaveTextContent('test USDC')
  })

  it('says so when the agent has not imported the statement, or holds an older one', async () => {
    await renderWith(issuedState(), null)
    expect(screen.getByTestId('grainhack-agent-note')).toHaveTextContent(`pnpm cli grainhack import ${STATEMENT_1}`)
    expect(screen.getAllByTestId('grainhack-winner').filter((w) => w.dataset.status === 'not_imported')).toHaveLength(3)
  })

  it('treats an agent view with history only as not imported', async () => {
    await renderWith(issuedState(), agentPayouts({ statement: null, winners: [] }))
    expect(screen.getByTestId('grainhack-agent-note')).toHaveTextContent('pnpm cli grainhack import')
  })

  it('warns when the agent is on an older statement', async () => {
    await renderWith(
      issuedState(adminView({ statement_id: STATEMENT_2, supersedes: STATEMENT_1, issued_at: '2026-10-04T09:00:00Z' })),
      agentPayouts(),
    )
    expect(screen.getByTestId('grainhack-agent-note')).toHaveTextContent('The agent is still on an older statement (issued 3 Oct 2026')
  })

  it('keeps the statement on screen when the agent cannot be read', async () => {
    await renderWith(issuedState(), new Error('down'))
    expect(screen.getByTestId('grainhack-agent-note')).toHaveTextContent("Couldn't read the agent's payouts")
    expect(screen.getAllByTestId('grainhack-winner').map((w) => w.dataset.status)).toContain('agent_unavailable')
  })

  it('says when the statement cannot be loaded', async () => {
    h.getResultsStatement.mockRejectedValue(new ApiError('x', 503, { error: 'database_not_configured' }))
    renderWithProviders(<GrainHackPayoutsPanel hackathonId={HACKATHON_ID} />)
    await waitFor(() => expect(panel().dataset.state).toBe('load-failed'))
    expect(panel()).toHaveTextContent('database_not_configured')
  })
})
