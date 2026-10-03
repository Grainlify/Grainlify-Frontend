import type { GrainHackResultsStatement, GrainHackStatementState } from '../../../../shared/api/client';
import type { GrainHackPublicPayouts } from '../../../../shared/api/bountyAgent';

/** Mock bodies in the payout contract's shapes, for tests and screenshots.
 *  Logins, ids and signatures are samples; nothing here was paid. */

export const HACKATHON_ID = '7a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d';
export const STATEMENT_1 = '5b0e9f3a-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
export const STATEMENT_2 = '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a';
const COMPUTATION = '4f6c2a1e-9b0d-4c3a-8e21-7d5b6a9c0e11';
const SIG = '3vQ7mJ1rX9kP2sT8wY4zA6bC5dE7fG9hJ2kL4mN6pQ8rS1tU3vW5xY7zA9bC2dE4fG6hJ8kL1mN3pQ5rS7tU9v';

export function statement(over: Partial<GrainHackResultsStatement> = {}): GrainHackResultsStatement {
  return {
    v: 1,
    kind: 'grainhack_results',
    statement_id: STATEMENT_1,
    supersedes: null,
    hackathon_id: HACKATHON_ID,
    hackathon_name: 'GrainHack October',
    pool: 'contributor',
    computation_id: COMPUTATION,
    currency: 'USDC',
    network: 'solana-devnet',
    pool_minor: '250000000',
    lines: [
      { github_user_id: 1101, login: 'sample-ada', amount_minor: '100000000', status: 'payable' },
      { github_user_id: 2202, login: 'sample-bo', amount_minor: '62500000', status: 'payable' },
      { github_user_id: 3303, login: 'sample-cy', amount_minor: '50000000', status: 'held_kyc' },
      { github_user_id: 4404, login: 'sample-dee', amount_minor: '25000000', status: 'payable' },
      { github_user_id: 5505, login: 'sample-eli', amount_minor: '12500000', status: 'payable' },
    ],
    issued_at: '2026-10-03T14:20:00Z',
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

/** The backend's GET/POST body for a statement. */
export function statementBody(s: GrainHackResultsStatement = statement()) {
  return { statement: canonical(s), signature: 'k2V9yQm4pT8sR1wX6zB3nC5dF7gH9jL2mP4qS6tV8xZ0aB1cD3eF5gH7jK9mN1pQ3rS5tV7wX9yZ1aC3eG5iK7mO9==', issued_by: 'Jagadeeshftw' };
}

export function issuedState(s: GrainHackResultsStatement = statement()): GrainHackStatementState {
  const body = statementBody(s);
  return { statement: s, canonical: body.statement, signature: body.signature, issuedBy: body.issued_by, configuredNetwork: s.network };
}

export const noStatementState: GrainHackStatementState = {
  statement: null,
  canonical: null,
  signature: null,
  issuedBy: null,
  configuredNetwork: 'solana-devnet',
};

/** The agent's public read: one paid, one unknown, one waiting for a wallet,
 *  one awaiting approval; the held winner shows as `waiting` publicly. */
export function agentPayouts(over: Partial<GrainHackPublicPayouts> = {}): GrainHackPublicPayouts {
  return {
    hackathonId: HACKATHON_ID,
    network: 'solana-devnet',
    currency: 'USDC',
    decimals: 6,
    statementId: STATEMENT_1,
    winners: [
      { login: 'sample-ada', githubUserId: 1101, amountMinor: '100000000', status: 'paid', txSignature: SIG, txUrl: null, paidAt: '2026-10-03T15:02:00Z' },
      { login: 'sample-bo', githubUserId: 2202, amountMinor: '62500000', status: 'awaiting_approval', txSignature: null, txUrl: null, paidAt: null },
      { login: 'sample-cy', githubUserId: 3303, amountMinor: '50000000', status: 'waiting', txSignature: null, txUrl: null, paidAt: null },
      { login: 'sample-dee', githubUserId: 4404, amountMinor: '25000000', status: 'waiting', txSignature: null, txUrl: null, paidAt: null },
      { login: 'sample-eli', githubUserId: 5505, amountMinor: '12500000', status: 'unknown', txSignature: '5hK2' + SIG.slice(4), txUrl: null, paidAt: null },
    ],
    ...over,
  };
}
