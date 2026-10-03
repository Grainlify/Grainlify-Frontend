import type { GrainHackResultsStatement } from '../../../../shared/api/client';
import type { GrainHackPublicPayouts } from '../../../../shared/api/bountyAgent';
import { txExplorerUrl } from '../../../../shared/utils/payoutNetwork';
import { formatMinor, sumMinor, type Tone } from '../keeperhub/keeperhubModel';

/** Presentation rules for the GrainHack Payouts panel (payout contract §4),
 *  kept out of the component so each can be tested on its own.
 *
 *  Two sources, merged per winner:
 *  - the backend's results statement: who is owed what, and who is held for
 *    KYC (only the backend and the admin may know that);
 *  - the agent's public payouts read: whether each payable winner is waiting
 *    for a wallet, awaiting approval, paid (with the transaction), or in an
 *    outcome nobody can confirm.
 *  The statement is the list. The agent can only add a status to a line on it. */

export type WinnerStatus =
  | 'paid'
  | 'unknown'
  | 'failed'
  | 'held_kyc'
  | 'awaiting_wallet'
  | 'awaiting_approval'
  /** The agent has not imported this statement (or this line) yet. */
  | 'not_imported'
  /** The agent couldn't be read, so its part of the status is not known. */
  | 'agent_unavailable';

export const WINNER_STATUS_ORDER: WinnerStatus[] = [
  'paid',
  'unknown',
  'failed',
  'awaiting_approval',
  'awaiting_wallet',
  'held_kyc',
  'not_imported',
  'agent_unavailable',
];

export const WINNER_STATUS_LABEL: Record<WinnerStatus, string> = {
  paid: 'Paid',
  unknown: 'Outcome unknown',
  failed: 'Failed, not sent',
  held_kyc: 'Held for KYC',
  awaiting_wallet: 'Waiting for a wallet',
  awaiting_approval: 'Awaiting approval',
  not_imported: 'Not imported by the agent',
  agent_unavailable: 'Agent status unavailable',
};

export const WINNER_STATUS_TONE: Record<WinnerStatus, Tone> = {
  paid: 'green',
  unknown: 'amber',
  failed: 'red',
  held_kyc: 'amber',
  awaiting_wallet: 'neutral',
  awaiting_approval: 'neutral',
  not_imported: 'neutral',
  agent_unavailable: 'neutral',
};

/** One sentence under each winner, saying what happens next and who does it. */
export const WINNER_STATUS_HINT: Record<WinnerStatus, string> = {
  paid: 'Confirmed on chain. Never paid again.',
  unknown: 'Sent, but the result could not be confirmed. Never retried automatically: a person checks the chain and records it with the resolve tool.',
  failed: 'Recorded as not sent.',
  held_kyc: 'Kept on the statement, not dropped. Once their KYC clears, issue a superseding statement.',
  awaiting_wallet: 'No Solana wallet linked yet. They have been asked to link one.',
  awaiting_approval: 'Ready. Paid once an approver signs it with approve-event.',
  not_imported: 'The agent has not imported this statement yet.',
  agent_unavailable: "Couldn't read the agent, so whether this was paid isn't known from this page.",
};

export type AgentRead = GrainHackPublicPayouts | null | 'unavailable';

export interface WinnerRow {
  github_user_id: number;
  login: string;
  amount_minor: string;
  status: WinnerStatus;
  /** An agent status this page doesn't know, shown verbatim. */
  rawStatus: string | null;
  txSignature: string | null;
  txUrl: string | null;
  paidAt: string | null;
}

const AGENT_STATUS: Record<string, WinnerStatus> = {
  paid: 'paid',
  unknown: 'unknown',
  failed: 'failed',
  awaiting_approval: 'awaiting_approval',
  // Publicly `waiting` covers held and no-wallet alike; the statement line
  // says which, so a payable line that is waiting is waiting for a wallet.
  waiting: 'awaiting_wallet',
  awaiting_wallet: 'awaiting_wallet',
  held_kyc: 'held_kyc',
};

export function winnerRows(statement: GrainHackResultsStatement, agent: AgentRead): WinnerRow[] {
  const winners = agent && agent !== 'unavailable' ? agent.winners : [];
  return statement.lines
    .slice()
    .sort((a, b) => a.github_user_id - b.github_user_id)
    .map((line) => {
      const w =
        winners.find((x) => x.githubUserId != null && x.githubUserId === line.github_user_id) ??
        winners.find((x) => x.githubUserId == null && x.login.toLowerCase() === line.login.toLowerCase());
      const mapped = w ? AGENT_STATUS[w.status] : undefined;
      let status: WinnerStatus;
      // What happened on chain outranks the line: a winner paid under an
      // older statement stays paid whatever a newer one says.
      if (mapped === 'paid' || mapped === 'unknown' || mapped === 'failed') status = mapped;
      else if (line.status === 'held_kyc') status = 'held_kyc';
      else if (agent === 'unavailable') status = 'agent_unavailable';
      else if (!w) status = 'not_imported';
      else status = mapped ?? 'awaiting_approval';
      const network = agent && agent !== 'unavailable' ? agent.network : statement.network;
      return {
        github_user_id: line.github_user_id,
        login: line.login,
        amount_minor: line.amount_minor,
        status,
        rawStatus: w && !mapped ? w.status : null,
        txSignature: w?.txSignature ?? null,
        txUrl: w?.txUrl ?? txExplorerUrl(network, w?.txSignature),
        paidAt: w?.paidAt ?? null,
      };
    });
}

export interface PayoutTotals {
  poolMinor: string;
  linesMinor: string;
  /** The contract's invariant: every line, payable and held, sums to the pool. */
  sumsToPool: boolean;
  paidMinor: string;
  /** Sent with no confirmed outcome. Neither paid nor unpaid. */
  unknownMinor: string;
  /** Everything else: held, waiting, awaiting approval, failed, not imported. */
  outstandingMinor: string;
  byStatus: Array<{ status: WinnerStatus; count: number; amountMinor: string }>;
}

export function payoutTotals(poolMinor: string, rows: WinnerRow[]): PayoutTotals {
  const of = (s: WinnerStatus) => rows.filter((r) => r.status === s);
  const linesMinor = sumMinor(rows.map((r) => r.amount_minor));
  const paidMinor = sumMinor(of('paid').map((r) => r.amount_minor));
  const unknownMinor = sumMinor(of('unknown').map((r) => r.amount_minor));
  return {
    poolMinor,
    linesMinor,
    sumsToPool: linesMinor === BigInt(poolMinor).toString(),
    paidMinor,
    unknownMinor,
    outstandingMinor: (BigInt(linesMinor) - BigInt(paidMinor) - BigInt(unknownMinor)).toString(),
    byStatus: WINNER_STATUS_ORDER.map((status) => {
      const r = of(status);
      return { status, count: r.length, amountMinor: sumMinor(r.map((x) => x.amount_minor)) };
    }).filter((s) => s.count > 0),
  };
}

/** USDC has 6 decimals. Devnet tokens have no value, and the label says so. */
export function usdc(minor: string, network: string | null | undefined): string {
  return formatMinor(minor, 6, network === 'solana-mainnet' ? 'USDC' : 'test USDC');
}

/** The exact command an approver runs, in the agent repo, on their own machine. */
export function approveCommand(hackathonId: string): string {
  return `pnpm approve-event ${hackathonId}`;
}

/** Why the backend refused to issue, in words for the admin. Unknown codes are
 *  named so they can be looked up. */
export function statementRefusal(code: string, detail: string): string {
  const tail = detail ? ` ${detail}` : '';
  switch (code) {
    case 'not_releasable':
      return `Not releasable yet: the event must be confirmed, not a shadow event, settled, with appeals closed.${tail}`;
    case 'winner_without_github':
      return `A winner has no GitHub account, so this path can't pay them. Resolve it, then issue.${tail}`;
    case 'other_rail':
    case 'keeperhub_run_exists':
      return `This pool already has a KeeperHub run or an Aptos settlement. One rail per pool.${tail}`;
    case 'nothing_changed':
      return 'Nothing has changed since the latest statement, so there is nothing to supersede it with.';
    case 'signing_key_not_configured':
      return "The backend has no results signing key configured, so it can't sign a statement.";
    case 'no_computation':
      return `The event has no payout computation yet.${tail}`;
    default:
      return `The statement wasn't issued${code ? ` (${code})` : ''}.${tail}`;
  }
}

export function shortUuid(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}
