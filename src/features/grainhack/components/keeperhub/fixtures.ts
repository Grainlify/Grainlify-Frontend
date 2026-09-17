import type { KeeperHubLeg, KeeperHubRunView } from '../../../../shared/api/client';

/** Response fixtures in #561's shape, for tests.
 *
 *  `resumable` reuses the real Base Sepolia run of 16 Sep 2026 (addresses,
 *  amounts, tx hashes, first execution). Logins are samples. `blocked` is the
 *  approved illustrative scenario
 *  whose status figures do not add up to the pool. */

const A = '0xE623Ed51dbE14e054b9595079c50f1a41FeAe2c1'
const B = '0x0fF6648C909aC780AAb8c1299F379B18C77f0fEE'
const C = '0xFBd7f8b3E1F538705ca2a3B392479E193a668233'
// Illustrative only; not a real participant.
const E = '0x7ab3c1d5e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9'
const ATTEMPT_1 = '6c1d1c7e-6d0a-4d7e-9a53-0b8e7f5b0a01'
const ATTEMPT_2 = '6c1d1c7e-6d0a-4d7e-9a53-0b8e7f5b0a02'

function leg(over: Partial<KeeperHubLeg> & Pick<KeeperHubLeg, 'id' | 'status' | 'amount_minor' | 'address'>): KeeperHubLeg {
  const blocks = over.status === 'unknown' || over.status === 'dispatched'
  return {
    user_id: `u-${over.id}`,
    github_login: `sample-${over.id}`,
    blocks_resume: blocks,
    block_reason: over.status === 'unknown' ? 'may_have_paid' : over.status === 'dispatched' ? 'awaiting_result' : null,
    resendable: over.status === 'failed' || over.status === 'pending',
    tx_hash: null,
    explorer_url: null,
    execution_id: 'kbzz0fkbmvbuq87wxsnsk',
    last_attempt_id: ATTEMPT_1,
    last_error: null,
    dispatched_at: '2026-09-16T12:13:00Z',
    confirmed_at: null,
    resolution_note: null,
    resolved_by: null,
    ...over,
  }
}

function byStatus(legs: KeeperHubLeg[]) {
  const out: KeeperHubRunView['derived_from_legs']['by_status'] = {}
  for (const s of ['pending', 'dispatched', 'confirmed', 'failed', 'unknown']) {
    const ls = legs.filter((l) => l.status === s)
    out[s] = { count: ls.length, amount_minor: ls.reduce((a, l) => a + BigInt(l.amount_minor), 0n).toString() }
  }
  return out
}

function view(legs: KeeperHubLeg[], resume: Partial<KeeperHubRunView['resume']>, over: Partial<KeeperHubRunView> = {}): KeeperHubRunView {
  return {
    run: {
      id: 'run-1',
      hackathon_id: 'h-1',
      pool: 'contributor',
      pool_minor: '3750001',
      chain_id: 'base-sepolia',
      evm_chain_id: 84532,
      state: 'dispatching',
      payout_run_id: 'pr-1',
      released_by: 'admin-1',
      created_at: '2026-09-16T12:10:00Z',
      updated_at: '2026-09-16T12:20:00Z',
      network: 'testnet',
      asset_symbol: 'USDC',
      asset_decimals: 6,
      explorer_url_template: 'https://sepolia.basescan.org/tx/%s',
    },
    derived_from_legs: {
      note: 'Counts and sums of amount_minor per leg status, computed from the leg rows.',
      leg_count: legs.length,
      by_status: byStatus(legs),
    },
    resume: {
      allowed: false,
      reason: '',
      detail: '',
      sendable_leg_ids: [],
      sendable_amount_minor: null,
      blocking_leg_ids: legs.filter((l) => l.blocks_resume).map((l) => l.id),
      assumes: 'Evaluated as though the release request were explicitly confirmed.',
      ...resume,
    },
    legs,
    attempts: [
      {
        ordinal: 1,
        id: ATTEMPT_1,
        state: 'reconciled',
        execution_id: 'kbzz0fkbmvbuq87wxsnsk',
        idempotency_key: '449ba38d-0000-4000-8000-000000000000',
        error: null,
        actor_user_id: 'admin-1',
        created_at: '2026-09-16T12:13:00Z',
        reconciled_at: '2026-09-16T12:20:00Z',
        leg_count: legs.length,
        legs: legs.map((l, i) => ({ position: i, leg_id: l.id })),
      },
    ],
    exclusions: [{ user_id: 'u-d', github_login: 'sample-d', amount_minor: '250000', reason: 'no_address' }],
    // The real run's org wallet.
    payout_wallet: {
      address: '0xE6e5e247ce27A43F724675DD679DC7a4a1896CA6',
      note: 'The sending wallet configured on this server now, not a value recorded with each attempt.',
    },
    ...over,
  }
}

const paidA = leg({ id: 'a', status: 'confirmed', amount_minor: '1000001', address: A, tx_hash: '0x3a383e59d5edf8311d1c5f212533704432185876228b8a4fbdbab0180aae3277', explorer_url: 'https://sepolia.basescan.org/tx/0x3a383e59d5edf8311d1c5f212533704432185876228b8a4fbdbab0180aae3277', confirmed_at: '2026-09-16T12:20:00Z' })
const paidC = leg({ id: 'c', status: 'confirmed', amount_minor: '500000', address: C, tx_hash: '0x8bbfd2f3599bce36c6610d5b298605efb424afd25822e40bdfd8811cf0df21ac', explorer_url: 'https://sepolia.basescan.org/tx/0x8bbfd2f3599bce36c6610d5b298605efb424afd25822e40bdfd8811cf0df21ac', confirmed_at: '2026-09-16T12:20:00Z' })

export function resumable(): KeeperHubRunView {
  const failedB = leg({ id: 'b', status: 'failed', amount_minor: '2000000', address: B, last_error: 'Insufficient USDC balance. Have: 1.0, Need: 2' })
  return view([paidA, failedB, paidC], {
    allowed: true,
    sendable_leg_ids: ['b'],
    sendable_amount_minor: '2000000',
    blocking_leg_ids: [],
  })
}

export function blocked(): KeeperHubRunView {
  const unknownB = leg({ id: 'b', status: 'unknown', amount_minor: '2000000', address: B })
  const failedE = leg({ id: 'e', status: 'failed', amount_minor: '750000', address: E, last_error: 'Insufficient USDC balance. Have: 0.5, Need: 0.75' })
  const v = view([paidA, unknownB, paidC, failedE], {
    allowed: false,
    reason: 'unreconciled_legs',
    detail: 'keeperhubrail: 1 leg is unknown or dispatched',
    blocking_leg_ids: ['b'],
  })
  v.run.pool_minor = '4500001'
  return v
}

export function notConfigured(): KeeperHubRunView {
  const v = blocked()
  v.resume = { ...v.resume, reason: 'keeperhub_not_configured', detail: 'keeperhub: KEEPERHUB_WEBHOOK_KEY is not set' }
  v.legs = v.legs.map((l) => (l.id === 'c' ? { ...l, github_login: null } : l))
  return v
}

export function awaiting(): KeeperHubRunView {
  const b = leg({ id: 'b', status: 'dispatched', amount_minor: '2000000', address: B, last_attempt_id: ATTEMPT_2, execution_id: 'a2782ji5qe6so31r7cdvy' })
  const v = view([paidA, b, paidC], { reason: 'unreconciled_legs', detail: '1 leg dispatched', blocking_leg_ids: ['b'] })
  v.attempts.push({
    ordinal: 2,
    id: ATTEMPT_2,
    state: 'sent',
    execution_id: 'a2782ji5qe6so31r7cdvy',
    idempotency_key: '7f00aa11-0000-4000-8000-000000000000',
    error: null,
    actor_user_id: 'admin-1',
    created_at: '2026-09-16T12:40:00Z',
    reconciled_at: null,
    leg_count: 1,
    legs: [{ position: 0, leg_id: 'b' }],
  })
  return v
}

export function runFailed(): KeeperHubRunView {
  const v = blocked()
  v.run.state = 'failed'
  v.resume = {
    ...v.resume,
    reason: 'run_failed',
    detail: 'A transaction was reported on chain 8453, but this run pays on chain 84532. No result from that attempt was recorded, and every leg in it now needs resolution.',
  }
  return v
}

export function allPaid(): KeeperHubRunView {
  // Placeholder hash: the real resume leg's hash is not needed to show this state.
  const b = leg({ id: 'b', status: 'confirmed', amount_minor: '2000000', address: B, tx_hash: `0x${'0'.repeat(60)}9f0e`, explorer_url: null, last_attempt_id: ATTEMPT_2 })
  const v = awaiting()
  v.legs = [paidA, b, paidC]
  v.derived_from_legs = { ...v.derived_from_legs, by_status: byStatus(v.legs) }
  v.attempts[1] = { ...v.attempts[1], state: 'reconciled', reconciled_at: '2026-09-16T12:45:00Z' }
  v.run.state = 'complete'
  v.resume = { ...v.resume, reason: 'nothing_unpaid', detail: 'every leg is confirmed', blocking_leg_ids: [] }
  return v
}
