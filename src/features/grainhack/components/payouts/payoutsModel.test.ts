import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError } from '../../../../shared/api/apiError'
import { getResultsStatement, issueResultsStatement } from '../../../../shared/api/client'
import { adminView, agentPayouts, COMPUTATION, HACKATHON_ID, publicWinner, SIG, STATEMENT_1 } from './fixtures'
import { agentBehind, agentImported, approveCommand, payoutTotals, statementRefusal, usdc, winnerRows } from './payoutsModel'

const fetchMock = vi.fn()

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('results statement client', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem('patchwork_jwt', 'test-token')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.removeItem('patchwork_jwt')
  })

  it('reads the admin view and parses the canonical statement for what only it carries', async () => {
    const view = adminView()
    fetchMock.mockResolvedValue(json(200, view))
    const s = await getResultsStatement(HACKATHON_ID)
    expect(fetchMock.mock.calls[0][0]).toContain(`/admin/hackathons/${HACKATHON_ID}/results-statement?pool=contributor`)
    expect(s.view).toEqual(view)
    expect(s.canonical).toMatchObject({ v: 1, kind: 'grainhack_results', hackathon_name: 'GrainHack October' })
    expect(s.currentPayoutRunId).toBe(COMPUTATION)
  })

  it('turns 404 not_found into no statement, keeping the current computation', async () => {
    fetchMock.mockResolvedValue(json(404, { error: 'not_found', current_payout_run_id: COMPUTATION }))
    expect(await getResultsStatement(HACKATHON_ID)).toEqual({ view: null, canonical: null, currentPayoutRunId: COMPUTATION })
    fetchMock.mockResolvedValue(json(404, { error: 'not_found', current_payout_run_id: null }))
    expect((await getResultsStatement(HACKATHON_ID)).currentPayoutRunId).toBeNull()
  })

  it('issues with confirm, the pool and the computation the admin looked at', async () => {
    fetchMock.mockResolvedValue(json(201, adminView()))
    const s = await issueResultsStatement(HACKATHON_ID, { payoutRunId: COMPUTATION })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain(`/admin/hackathons/${HACKATHON_ID}/results-statement`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ confirm: true, pool: 'contributor', payout_run_id: COMPUTATION })
    expect(s.view?.statement_id).toBe(STATEMENT_1)
  })

  it('leaves payout_run_id out when there is none, and surfaces refusals as ApiError', async () => {
    fetchMock.mockResolvedValue(json(409, { error: 'nothing_to_supersede', detail: 'still stands' }))
    const err = await issueResultsStatement(HACKATHON_ID).catch((e) => e)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ confirm: true, pool: 'contributor' })
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(409)
    expect(err.data.error).toBe('nothing_to_supersede')
  })
})

describe('winnerRows', () => {
  it('merges the admin view with the agent: paid from the backend, held from the line, sending and waiting from the agent', () => {
    const rows = winnerRows(adminView(), agentPayouts())
    expect(rows.map((r) => [r.login, r.status])).toEqual([
      ['sample-ada', 'paid'],
      ['sample-bo', 'waiting'],
      ['sample-cy', 'held_kyc'],
      ['sample-dee', 'waiting'],
      ['sample-eli', 'sending'],
    ])
  })

  it("takes the paid transaction and link from the backend's report, not from the agent", () => {
    const paid = winnerRows(adminView(), agentPayouts())[0]
    expect(paid.txSignature).toBe(SIG)
    expect(paid.txUrl).toBe(`https://explorer.solana.com/tx/${SIG}?cluster=devnet`)
  })

  it('says paid, not yet reported, when only the agent has it paid', () => {
    const v = adminView({ lines: adminView().lines.map((l) => ({ ...l, paid_tx_signature: null, paid_tx_url: null })) })
    const row = winnerRows(v, agentPayouts())[0]
    expect(row).toMatchObject({ status: 'paid_unreported', txUrl: `https://solscan.io/tx/${SIG}?cluster=devnet` })
    expect(payoutTotals(v.pool_minor, winnerRows(v, agentPayouts())).paidMinor).toBe('0')
  })

  it('keeps a winner paid under an older statement paid, whatever the line now says', () => {
    const v = adminView({ lines: adminView().lines.map((l) => (l.login === 'sample-ada' ? { ...l, status: 'held_kyc' as const, kyc_verified_now: false } : l)) })
    expect(winnerRows(v, agentPayouts())[0].status).toBe('paid')
  })

  it('tells a held winner whose KYC is verified now from one still unverified', () => {
    const v = adminView({ lines: adminView().lines.map((l) => (l.login === 'sample-cy' ? { ...l, kyc_verified_now: true } : l)) })
    expect(winnerRows(v, agentPayouts())[2].status).toBe('held_kyc_cleared')
  })

  it('flags a payable winner whose KYC has lapsed since the statement', () => {
    const v = adminView({ lines: adminView().lines.map((l) => (l.login === 'sample-bo' ? { ...l, kyc_verified_now: false } : l)) })
    const rows = winnerRows(v, agentPayouts())
    expect(rows[1]).toMatchObject({ status: 'waiting', kycLapsed: true })
    expect(rows.filter((r) => r.kycLapsed)).toHaveLength(1)
  })

  it('says not imported when the agent has nothing, and unavailable when it cannot be read', () => {
    expect(winnerRows(adminView(), null).map((r) => r.status)).toEqual(['paid', 'not_imported', 'held_kyc', 'not_imported', 'not_imported'])
    expect(winnerRows(adminView(), 'unavailable').map((r) => r.status)).toEqual(['paid', 'agent_unavailable', 'held_kyc', 'agent_unavailable', 'agent_unavailable'])
  })

  it('matches by login, case-insensitively, and never against a history row', () => {
    const a = agentPayouts({
      winners: agentPayouts().winners.map((w) => ({ ...w, login: w.login.toUpperCase() })),
      history: [publicWinner('sample-bo', '4000000', 'paid', { history: true, network: 'base-sepolia' })],
    })
    expect(winnerRows(adminView(), a).map((r) => r.status)).toEqual(['paid', 'waiting', 'held_kyc', 'waiting', 'sending'])
    const onlyHistory = agentPayouts({ winners: [publicWinner('sample-bo', '4000000', 'paid', { history: true })] })
    expect(winnerRows(adminView(), onlyHistory)[1].status).toBe('not_imported')
  })
})

describe('agent statement', () => {
  it('compares the statement by its issue time: the public view has no statement id', () => {
    expect(agentBehind(adminView(), agentPayouts())).toBe(false)
    expect(agentBehind(adminView(), agentPayouts({ statement: { issuedAt: '2026-10-02T09:00:00.000Z', poolMinor: '250000000' } }))).toBe(true)
    expect(agentBehind(adminView(), null)).toBe(false)
  })

  it('does not count a view with history only as an import', () => {
    expect(agentImported(agentPayouts())).toBe(true)
    expect(agentImported(agentPayouts({ statement: null, winners: [] }))).toBe(false)
    expect(agentImported('unavailable')).toBe(false)
  })
})

describe('payoutTotals', () => {
  it('splits the pool into paid, sending and not paid yet, which add back up to it', () => {
    const t = payoutTotals('250000000', winnerRows(adminView(), agentPayouts()))
    expect(t).toMatchObject({ sumsToPool: true, paidMinor: '100000000', sendingMinor: '12500000', outstandingMinor: '137500000' })
    expect(t.byStatus.map((b) => [b.status, b.count])).toEqual([
      ['paid', 1],
      ['sending', 1],
      ['waiting', 2],
      ['held_kyc', 1],
    ])
  })

  it('flags lines that do not sum to the pool', () => {
    expect(payoutTotals('250000001', winnerRows(adminView(), agentPayouts())).sumsToPool).toBe(false)
  })
})

describe('labels', () => {
  it('says test USDC on devnet and USDC on mainnet', () => {
    expect(usdc('4000000', 'solana-devnet')).toBe('4.000000 test USDC')
    expect(usdc('4000000', 'solana-mainnet')).toBe('4.000000 USDC')
  })

  it('gives the exact approve command', () => {
    expect(approveCommand('abc-123')).toBe('pnpm approve-event abc-123')
  })

  it('explains each refusal and names unknown codes', () => {
    expect(statementRefusal('not_releasable', '')).toMatch(/appeals closed/)
    expect(statementRefusal('winner_without_github', 'user 9 has no GitHub account')).toMatch(/user 9 has no GitHub account$/)
    expect(statementRefusal('keeperhub_run_exists', '')).toMatch(/One rail per pool/)
    expect(statementRefusal('teapot', '')).toBe("The statement wasn't issued (teapot).")
  })
})
