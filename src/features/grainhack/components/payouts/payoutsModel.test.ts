import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError } from '../../../../shared/api/apiError'
import { getGrainHackResultsKey, getResultsStatement, issueResultsStatement } from '../../../../shared/api/client'
import { getGrainHackPayouts } from '../../../../shared/api/bountyAgent'
import { adminView, agentPayouts, COMPUTATION, HACKATHON_ID, publicWinner, SIG, STATEMENT_1 } from './fixtures'
import { agentBehind, agentImported, approveCommand, payoutTotals, statementRefusal, usdc, winnerRows, winnerWithoutGitHubName } from './payoutsModel'

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

  it('refuses a 200 that is not a statement view instead of handing the panel undefined fields', async () => {
    // The regression suite's generic stub answered {settings: [], ...}; reading
    // statement_id off it took the whole admin event page down.
    for (const body of [{}, { settings: [], entries: [] }, { ...adminView(), statement_id: undefined }, { ...adminView(), chain: null }]) {
      fetchMock.mockResolvedValue(json(200, body))
      await expect(getResultsStatement(HACKATHON_ID)).rejects.toThrow(/not a results statement/)
    }
    fetchMock.mockResolvedValue(json(201, {}))
    await expect(issueResultsStatement(HACKATHON_ID, { payoutRunId: COMPUTATION })).rejects.toThrow(/not a results statement/)
  })

  it("refuses an agent answer without a winners list, so the panel shows the agent as unavailable", async () => {
    fetchMock.mockResolvedValue(json(200, { settings: [], payouts: [] }))
    await expect(getGrainHackPayouts(HACKATHON_ID)).rejects.toThrow(/not a GrainHack payouts view/)
    fetchMock.mockResolvedValue(json(200, agentPayouts()))
    expect((await getGrainHackPayouts(HACKATHON_ID))?.winners.length).toBeGreaterThan(0)
    fetchMock.mockResolvedValue(json(404, { error: 'not_found' }))
    expect(await getGrainHackPayouts(HACKATHON_ID)).toBeNull()
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

describe('results key client', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('reads the public key, domain and payout network, without signing in', async () => {
    const key = { public_key: 'q1W2', domain: 'grainlify-grainhack-results:v1\n', network: 'solana-devnet' }
    fetchMock.mockResolvedValue(json(200, key))
    expect(await getGrainHackResultsKey()).toEqual(key)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/grainhack\/results-key$/)
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('answers null when the backend says signing is unconfigured (503)', async () => {
    fetchMock.mockResolvedValue(json(503, { error: 'grainhack_results_unconfigured', detail: 'GRAINHACK_RESULTS_SIGNING_KEY is not set' }))
    expect(await getGrainHackResultsKey()).toBeNull()
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
    expect(usdc('4000000', 'solana-devnet')).toBe('4.00 test USDC')
    expect(usdc('4000000', 'solana-mainnet')).toBe('4.00 USDC')
  })

  it('drops trailing zeros past the cents and never rounds', () => {
    expect(usdc('250000000', 'solana-devnet')).toBe('250.00 test USDC')
    expect(usdc('62500000', 'solana-devnet')).toBe('62.50 test USDC')
    expect(usdc('4123450', 'solana-devnet')).toBe('4.12345 test USDC')
    expect(usdc('4123456', 'solana-devnet')).toBe('4.123456 test USDC')
    expect(usdc('1', 'solana-devnet')).toBe('0.000001 test USDC')
    expect(usdc('0', 'solana-devnet')).toBe('0 test USDC')
  })

  it('gives the exact approve command', () => {
    expect(approveCommand('abc-123')).toBe('pnpm approve-event abc-123')
  })

  it('names unknown refusal codes so they can be looked up', () => {
    expect(statementRefusal('teapot').message).toBe("The statement wasn't issued (teapot).")
    expect(statementRefusal('').message).toBe("The statement wasn't issued.")
  })
})

describe('statementRefusal', () => {
  // Every code internal/handlers/grainhack_payout.go can answer the issue call
  // with, and a word each sentence must carry to be the right one.
  const cases: Array<[string, RegExp]> = [
    ['payout_not_releasable', /settled \(phase 6\) with its appeal window closed, and not in shadow mode/],
    ['winners_without_github', /no linked GitHub account/],
    ['paid_on_other_rail', /one rail only/],
    ['nothing_to_supersede', /nothing to supersede/],
    ['computation_changed', /payout computation has changed/],
    ['settlement_changed', /amount no longer matches/],
    ['network_changed', /GRAINHACK_PAYOUT_NETWORK/],
    ['payout_run_not_current', /Reload to see the current figures/],
    ['no_computation', /no payout computation yet/],
    ['nothing_to_settle', /nothing to settle/i],
    ['concurrent_issue', /at the same moment/],
    ['pool_unsupported', /Only the contributor pool/],
    ['grainhack_results_unconfigured', /GRAINHACK_RESULTS_SIGNING_KEY/],
  ]
  it.each(cases)('says what %s means in a plain sentence', (code, words) => {
    const r = statementRefusal(code, { error: code, detail: 'backend words' })
    expect(r.message).toMatch(words)
    expect(r.message).not.toContain(code)
    expect(r.detail).toBe('backend words')
  })

  it('names the rail already paying the pool', () => {
    expect(statementRefusal('paid_on_other_rail', { rail: 'keeperhub' }).message).toMatch(/^This pool is already being paid on the KeeperHub \(Base\) rail/)
    expect(statementRefusal('paid_on_other_rail', { rail: 'aptos' }).message).toMatch(/the Aptos rail/)
  })

  it('carries the winners a statement would drop, by verdict login or user id', () => {
    const winners = [
      { user_id: '11111111-2222-4333-8444-555555555555', verdict_logins: ['old-login', 'new-login'], amount_minor: '4000000' },
      { user_id: '66666666-7777-4888-8999-000000000000', verdict_logins: [], amount_minor: '1000000' },
    ]
    const r = statementRefusal('winners_without_github', { error: 'winners_without_github', winners, detail: 'refused: 2 winner(s)' })
    expect(r.winners).toEqual(winners)
    expect(winnerWithoutGitHubName(winners[0])).toBe('@old-login / @new-login')
    expect(winnerWithoutGitHubName(winners[1])).toBe('user 66666666…')
  })
})
