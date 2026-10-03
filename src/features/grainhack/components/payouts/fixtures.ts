import type { GrainHackAdminLine, GrainHackAdminStatementView, GrainHackStatementState } from '../../../../shared/api/client';
import type { GrainHackPublicPayouts, GrainHackPublicWinner } from '../../../../shared/api/bountyAgent';

/** Mock bodies in the exact shapes the backend (internal/grainhack/view.go)
 *  and the agent (apps/agent/src/grainhack/ledger.ts) return, for tests and
 *  screenshots. Logins, ids and signatures are samples; nothing here was paid. */

export const HACKATHON_ID = '7a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d';
export const STATEMENT_1 = '5b0e9f3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
export const STATEMENT_2 = '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a';
export const COMPUTATION = '4f6c2a1e-9b0d-4c3a-8e21-7d5b6a9c0e11';
export const ADMIN_ID = 'a0d1e2f3-0000-4000-8000-00000000ad01';
export const SIG = '3vQ7mJ1rX9kP2sT8wY4zA6bC5dE7fG9hJ2kL4mN6pQ8rS1tU3vW5xY7zA9bC2dE4fG6hJ8kL1mN3pQ5rS7tU9v';
export const SIG_2 = '5hK2' + SIG.slice(4);
export const ISSUED_AT = '2026-10-03T14:20:00Z';

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function line(github_user_id: number, login: string, amount_minor: string, over: Partial<GrainHackAdminLine> = {}): GrainHackAdminLine {
  return {
    github_user_id,
    user_id: uid(github_user_id),
    login,
    amount_minor,
    status: 'payable',
    kyc_verified_now: true,
    paid_tx_signature: null,
    paid_tx_url: null,
    ...over,
  };
}

/** Sorted-key, no-whitespace JSON, as the backend signs it. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** The admin view: five winners. sample-ada paid (reported to the backend),
 *  sample-cy held for KYC and still unverified. */
export function adminView(over: Partial<GrainHackAdminStatementView> = {}): GrainHackAdminStatementView {
  const base = {
    statement_id: STATEMENT_1,
    supersedes: null as string | null,
    hackathon_id: HACKATHON_ID,
    pool: 'contributor',
    computation_id: COMPUTATION,
    currency: 'USDC',
    network: 'solana-devnet',
    pool_minor: '250000000',
    issued_at: ISSUED_AT,
    lines: [
      line(1101, 'sample-ada', '100000000', { paid_tx_signature: SIG, paid_tx_url: `https://explorer.solana.com/tx/${SIG}?cluster=devnet` }),
      line(2202, 'sample-bo', '62500000'),
      line(3303, 'sample-cy', '50000000', { status: 'held_kyc', kyc_verified_now: false }),
      line(4404, 'sample-dee', '25000000'),
      line(5505, 'sample-eli', '12500000'),
    ],
    ...over,
  };
  const statement = canonical({
    v: 1,
    kind: 'grainhack_results',
    statement_id: base.statement_id,
    supersedes: base.supersedes,
    hackathon_id: base.hackathon_id,
    hackathon_name: 'GrainHack October',
    pool: base.pool,
    computation_id: base.computation_id,
    currency: base.currency,
    network: base.network,
    pool_minor: base.pool_minor,
    lines: base.lines.map((l) => ({ github_user_id: l.github_user_id, login: l.login, amount_minor: l.amount_minor, status: l.status })),
    issued_at: base.issued_at,
  });
  return {
    statement,
    signature: 'k2V9yQm4pT8sR1wX6zB3nC5dF7gH9jL2mP4qS6tV8xZ0aB1cD3eF5gH7jK9mN1pQ3rS5tV7wX9yZ1aC3eG5iK7mO9==',
    public_key: 'q1W2e3R4t5Y6u7I8o9P0a1S2d3F4g5H6j7K8l9Z0x1c=',
    statement_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    issued_by: ADMIN_ID,
    chain: base.supersedes ? [base.supersedes, base.statement_id] : [base.statement_id],
    supersede_available: false,
    current_payout_run_id: COMPUTATION,
    ...base,
  };
}

export function issuedState(view: GrainHackAdminStatementView = adminView()): GrainHackStatementState {
  return { view, canonical: JSON.parse(view.statement), currentPayoutRunId: view.current_payout_run_id };
}

export const noStatementState: GrainHackStatementState = {
  view: null,
  canonical: null,
  currentPayoutRunId: COMPUTATION,
};

function pub(login: string, amountMinor: string, status: GrainHackPublicWinner['status'], over: Partial<GrainHackPublicWinner> = {}): GrainHackPublicWinner {
  const paid = status === 'paid';
  return {
    login,
    amountMinor,
    decimals: 6,
    currency: 'USDC',
    network: 'solana-devnet',
    amount: `${(Number(amountMinor) / 1e6).toFixed(2)} test USDC`,
    status,
    txSignature: paid ? SIG : null,
    txUrl: paid ? `https://solscan.io/tx/${SIG}?cluster=devnet` : null,
    paidAt: paid ? '2026-10-03T15:02:00.000Z' : null,
    test: true,
    history: false,
    note: null,
    ...over,
  };
}

/** The agent's public read, as publicGrainhackEvent builds it: one paid, one
 *  sending, the rest waiting (the held winner included: no KYC in public). */
export function agentPayouts(over: Partial<GrainHackPublicPayouts> = {}): GrainHackPublicPayouts {
  return {
    hackathonId: HACKATHON_ID,
    hackathonName: 'GrainHack October',
    pool: 'contributor',
    network: 'solana-devnet',
    test: true,
    currency: 'USDC',
    statement: { issuedAt: '2026-10-03T14:20:00.000Z', poolMinor: '250000000' },
    winners: [
      pub('sample-ada', '100000000', 'paid'),
      pub('sample-bo', '62500000', 'waiting'),
      pub('sample-cy', '50000000', 'waiting'),
      pub('sample-dee', '25000000', 'waiting'),
      pub('sample-eli', '12500000', 'sending'),
    ],
    history: [],
    funding: [],
    totals: {
      poolMinor: '250000000',
      paidMinor: '100000000',
      waitingMinor: '150000000',
      paidCount: 1,
      waitingCount: 4,
      fundedMinor: '0',
      historyPaidMinor: '0',
    },
    ...over,
  };
}

export { pub as publicWinner };
