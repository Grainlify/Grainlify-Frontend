import { describe, it, expect } from 'vitest'
import { parseResultsStatementBody } from '../../../../shared/api/client'
import { agentPayouts, canonical, statement, statementBody, STATEMENT_1 } from './fixtures'
import { approveCommand, payoutTotals, statementRefusal, usdc, winnerRows } from './payoutsModel'

describe('parseResultsStatementBody', () => {
  it('parses the canonical JSON string and keeps it verbatim', () => {
    const body = statementBody()
    const s = parseResultsStatementBody(body)
    expect(s.canonical).toBe(body.statement)
    expect(s.statement?.statement_id).toBe(STATEMENT_1)
    expect(s.signature).toBe(body.signature)
    expect(s.issuedBy).toBe('Jagadeeshftw')
    expect(s.configuredNetwork).toBe('solana-devnet')
  })

  it('accepts an already-parsed statement and a body with none', () => {
    expect(parseResultsStatementBody({ statement: statement(), signature: 'x' }).statement?.pool_minor).toBe('250000000')
    expect(parseResultsStatementBody({ error: 'not_found', network: 'solana-devnet', statement: null })).toEqual({
      statement: null,
      canonical: null,
      signature: null,
      issuedBy: null,
      configuredNetwork: 'solana-devnet',
    })
  })

  it('canonical() sorts keys at every level with no whitespace', () => {
    expect(canonical({ b: 1, a: { d: [{ z: 1, y: 2 }], c: null } })).toBe('{"a":{"c":null,"d":[{"y":2,"z":1}]},"b":1}')
  })
})

describe('winnerRows', () => {
  it('merges the statement with the agent: held stays held although public says waiting', () => {
    const rows = winnerRows(statement(), agentPayouts())
    expect(rows.map((r) => [r.login, r.status])).toEqual([
      ['sample-ada', 'paid'],
      ['sample-bo', 'awaiting_approval'],
      ['sample-cy', 'held_kyc'],
      ['sample-dee', 'awaiting_wallet'],
      ['sample-eli', 'unknown'],
    ])
  })

  it('builds a devnet explorer link when the agent sends a signature without a url', () => {
    const paid = winnerRows(statement(), agentPayouts())[0]
    expect(paid.txUrl).toMatch(/^https:\/\/explorer\.solana\.com\/tx\/3vQ7.*\?cluster=devnet$/)
  })

  it('keeps a winner paid under an older statement paid, whatever the line now says', () => {
    const s = statement({ lines: statement().lines.map((l) => (l.login === 'sample-ada' ? { ...l, status: 'held_kyc' } : l)) })
    expect(winnerRows(s, agentPayouts())[0].status).toBe('paid')
  })

  it('says not imported when the agent has nothing, and unavailable when it cannot be read', () => {
    expect(winnerRows(statement(), null).map((r) => r.status)).toEqual(['not_imported', 'not_imported', 'held_kyc', 'not_imported', 'not_imported'])
    expect(winnerRows(statement(), 'unavailable').map((r) => r.status)).toEqual(['agent_unavailable', 'agent_unavailable', 'held_kyc', 'agent_unavailable', 'agent_unavailable'])
  })

  it('matches by login when the agent sends no github id, and shows an unknown agent status verbatim', () => {
    const a = agentPayouts({ winners: agentPayouts().winners.map((w) => ({ ...w, githubUserId: undefined, login: w.login.toUpperCase(), status: w.login === 'sample-bo' ? 'broadcasting' : w.status })) })
    const rows = winnerRows(statement(), a)
    expect(rows[0].status).toBe('paid')
    expect(rows[1]).toMatchObject({ status: 'awaiting_approval', rawStatus: 'broadcasting' })
  })
})

describe('payoutTotals', () => {
  it('splits the pool into paid, unknown and not paid yet, which add back up to it', () => {
    const t = payoutTotals('250000000', winnerRows(statement(), agentPayouts()))
    expect(t).toMatchObject({ sumsToPool: true, paidMinor: '100000000', unknownMinor: '12500000', outstandingMinor: '137500000' })
    expect(t.byStatus.map((b) => [b.status, b.count])).toEqual([
      ['paid', 1],
      ['unknown', 1],
      ['awaiting_approval', 1],
      ['awaiting_wallet', 1],
      ['held_kyc', 1],
    ])
  })

  it('flags lines that do not sum to the pool', () => {
    expect(payoutTotals('250000001', winnerRows(statement(), agentPayouts())).sumsToPool).toBe(false)
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
