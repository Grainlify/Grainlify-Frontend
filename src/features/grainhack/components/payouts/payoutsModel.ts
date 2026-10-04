import type { GrainHackAdminLine, GrainHackAdminStatementView } from '../../../../shared/api/client';
import type { GrainHackPublicPayouts, GrainHackPublicWinner } from '../../../../shared/api/bountyAgent';
import { formatMinor, sumMinor, type Tone } from '../keeperhub/keeperhubModel';

/** Presentation rules for the GrainHack Payouts panel (payout contract §4),
 *  kept out of the component so each can be tested on its own.
 *
 *  Two sources, merged per winner:
 *  - the backend's admin view of the results statement: who is owed what,
 *    whether each line is payable or held for KYC, whether their KYC is
 *    verified now, and the payment the agent reported back (tx signature and
 *    explorer link). Only the backend and the admin may know about KYC.
 *  - the agent's public per-event view: per login, `waiting` | `sending` |
 *    `paid`, nothing more. Publicly a held winner, one with no wallet and one
 *    awaiting approval all read `waiting`.
 *  The statement is the list. The agent can only add a status to a line on it,
 *  and a payment counts as paid here once the backend has recorded it. */

export type WinnerStatus =
  /** The backend has the agent's payment report: tx signature and link. */
  | 'paid'
  /** The agent's public view says paid; the backend has no report yet. */
  | 'paid_unreported'
  /** The agent's public view says sending: submitted, or an outcome nobody has confirmed. */
  | 'sending'
  /** Held on the statement; their KYC is still not verified. */
  | 'held_kyc'
  /** Held on the statement, but their KYC is verified now: supersede to release. */
  | 'held_kyc_cleared'
  /** Payable; publicly waiting, which is either for a wallet or for approval. */
  | 'waiting'
  /** The agent has no row for this winner (or hasn't imported a statement). */
  | 'not_imported'
  /** The agent couldn't be read, so its part of the status is not known. */
  | 'agent_unavailable';

export const WINNER_STATUS_ORDER: WinnerStatus[] = [
  'paid',
  'paid_unreported',
  'sending',
  'waiting',
  'held_kyc_cleared',
  'held_kyc',
  'not_imported',
  'agent_unavailable',
];

export const WINNER_STATUS_LABEL: Record<WinnerStatus, string> = {
  paid: 'Paid',
  paid_unreported: 'Paid, not yet reported',
  sending: 'Sending',
  held_kyc: 'Held for KYC',
  held_kyc_cleared: 'KYC cleared, still held',
  waiting: 'Waiting',
  not_imported: 'Not imported by the agent',
  agent_unavailable: 'Agent status unavailable',
};

export const WINNER_STATUS_TONE: Record<WinnerStatus, Tone> = {
  paid: 'green',
  paid_unreported: 'green',
  sending: 'amber',
  held_kyc: 'amber',
  held_kyc_cleared: 'amber',
  waiting: 'neutral',
  not_imported: 'neutral',
  agent_unavailable: 'neutral',
};

/** One sentence under each winner, saying what happens next and who does it. */
export const WINNER_STATUS_HINT: Record<WinnerStatus, string> = {
  paid: 'Paid and reported to the backend; the winner has been told. Never paid again.',
  paid_unreported:
    "The agent shows this paid, but the backend hasn't recorded its payment report yet, so the winner hasn't been told. It moves to Paid once the report arrives.",
  sending:
    'Submitted, or sent with an outcome nobody has confirmed yet. Never retried automatically: if it stays here, a person checks the chain and records it with the resolve tool.',
  held_kyc: 'Kept on the statement, not dropped, and told in-app. Once their KYC clears, issue a superseding statement.',
  held_kyc_cleared: 'Their KYC is verified now. Issue a superseding statement to make them payable.',
  waiting:
    "Payable. Waiting either for a linked Solana wallet (they are asked to link one) or for an approver to run approve-event; the public view doesn't say which, the approve-event table does.",
  not_imported: "The agent hasn't imported a statement with this winner on it yet.",
  agent_unavailable: "Couldn't read the agent, so whether this is waiting or sending isn't known from this page.",
};

export type AgentRead = GrainHackPublicPayouts | null | 'unavailable';

export interface WinnerRow {
  github_user_id: number;
  login: string;
  amount_minor: string;
  status: WinnerStatus;
  txSignature: string | null;
  txUrl: string | null;
  /** The line is payable but the person's KYC is no longer verified. The
   *  signer still pays a payable line; a superseding statement would hold it. */
  kycLapsed: boolean;
}

/** The agent's row for a statement line. The public view carries no github id,
 *  so the login is the key (GitHub logins are case-insensitive). History rows
 *  are payments from before this path and never match a current line. */
function agentWinner(agent: AgentRead, line: GrainHackAdminLine): GrainHackPublicWinner | undefined {
  if (!agent || agent === 'unavailable') return undefined;
  return agent.winners.find((w) => !w.history && w.login.toLowerCase() === line.login.toLowerCase());
}

export function winnerRows(view: GrainHackAdminStatementView, agent: AgentRead): WinnerRow[] {
  return view.lines
    .slice()
    .sort((a, b) => a.github_user_id - b.github_user_id)
    .map((line) => {
      const w = agentWinner(agent, line);
      let status: WinnerStatus;
      let txSignature: string | null = null;
      let txUrl: string | null = null;
      // What happened on chain outranks the line: a winner paid under an
      // older statement stays paid whatever a newer one says.
      if (line.paid_tx_signature) {
        status = 'paid';
        txSignature = line.paid_tx_signature;
        txUrl = line.paid_tx_url;
      } else if (w?.status === 'paid') {
        status = 'paid_unreported';
        txSignature = w.txSignature;
        txUrl = w.txUrl;
      } else if (w?.status === 'sending') status = 'sending';
      else if (line.status === 'held_kyc') status = line.kyc_verified_now ? 'held_kyc_cleared' : 'held_kyc';
      else if (agent === 'unavailable') status = 'agent_unavailable';
      else if (!w) status = 'not_imported';
      else status = 'waiting';
      return {
        github_user_id: line.github_user_id,
        login: line.login,
        amount_minor: line.amount_minor,
        status,
        txSignature,
        txUrl,
        kycLapsed: line.status === 'payable' && !line.kyc_verified_now && status !== 'paid',
      };
    });
}

/** The agent is on an older statement than the backend's latest: its current
 *  statement was issued at a different moment. The public view carries no
 *  statement id, so issuedAt is what tells two statements apart. */
export function agentBehind(view: GrainHackAdminStatementView, agent: AgentRead): boolean {
  if (!agent || agent === 'unavailable' || !agent.statement) return false;
  return new Date(agent.statement.issuedAt).getTime() !== new Date(view.issued_at).getTime();
}

/** The agent has imported a statement for this event. Its view can exist with
 *  no statement (event 1's history rows only), which is not an import. */
export function agentImported(agent: AgentRead): boolean {
  return Boolean(agent && agent !== 'unavailable' && agent.statement);
}

export interface PayoutTotals {
  poolMinor: string;
  linesMinor: string;
  /** The contract's invariant: every line, payable and held, sums to the pool. */
  sumsToPool: boolean;
  paidMinor: string;
  /** Sending, or paid per the agent with no report at the backend yet. */
  sendingMinor: string;
  /** Everything else: held, waiting, not imported. */
  outstandingMinor: string;
  byStatus: Array<{ status: WinnerStatus; count: number; amountMinor: string }>;
}

export function payoutTotals(poolMinor: string, rows: WinnerRow[]): PayoutTotals {
  const of = (...s: WinnerStatus[]) => rows.filter((r) => s.includes(r.status));
  const linesMinor = sumMinor(rows.map((r) => r.amount_minor));
  const paidMinor = sumMinor(of('paid').map((r) => r.amount_minor));
  const sendingMinor = sumMinor(of('sending', 'paid_unreported').map((r) => r.amount_minor));
  return {
    poolMinor,
    linesMinor,
    sumsToPool: linesMinor === BigInt(poolMinor).toString(),
    paidMinor,
    sendingMinor,
    outstandingMinor: (BigInt(linesMinor) - BigInt(paidMinor) - BigInt(sendingMinor)).toString(),
    byStatus: WINNER_STATUS_ORDER.map((status) => {
      const r = of(status);
      return { status, count: r.length, amountMinor: sumMinor(r.map((x) => x.amount_minor)) };
    }).filter((s) => s.count > 0),
  };
}

/** USDC has 6 decimals. Devnet tokens have no value, and the label says so.
 *  Trailing zeros past the cents are dropped, never rounded: 250.000000 reads
 *  250.00 and 62.500000 reads 62.50, while 4.123456 keeps every digit. */
export function usdc(minor: string, network: string | null | undefined): string {
  const exact = formatMinor(minor, 6, null);
  const shown = exact.replace(/(\.\d{2}\d*?)0+$/, '$1');
  return `${shown} ${network === 'solana-mainnet' ? 'USDC' : 'test USDC'}`;
}

/** The exact command an approver runs, in the agent repo, on their own machine. */
export function approveCommand(hackathonId: string): string {
  return `pnpm approve-event ${hackathonId}`;
}

/** A winner the backend could not put on a statement (WinnerWithoutGitHub). */
export interface WinnerWithoutGitHub {
  user_id: string;
  /** The GitHub logins their verdicts were recorded under; may be empty. */
  verdict_logins: string[];
  amount_minor: string;
}

export interface StatementRefusal {
  code: string;
  /** One plain sentence (or two) for the admin. */
  message: string;
  /** The backend's own wording, kept for whoever has to look into it. */
  detail: string | null;
  /** Set on winners_without_github: who the statement would have dropped. */
  winners: WinnerWithoutGitHub[];
}

/** What each refusal from POST /admin/hackathons/:id/results-statement means,
 *  from internal/handlers/grainhack_payout.go grainhackError and the errors it
 *  maps (internal/grainhack/issue.go, hackathon.GuardPayoutRelease,
 *  hackathon.SettlementFor). */
const REFUSAL: Record<string, string> = {
  payout_not_releasable:
    "The event can't be paid yet. A statement is a payout release, so the event must be settled (phase 6) with its appeal window closed, and not in shadow mode.",
  winners_without_github:
    "Some winners have no linked GitHub account, so this path can't pay them and nothing was issued. Link or resolve each one below, then issue again.",
  paid_on_other_rail:
    'This pool is already being paid on another rail, so nothing was issued. An event pool is paid on one rail only.',
  nothing_to_supersede:
    "Nothing has changed since the latest statement: every winner's KYC status and login is as it was. There is nothing to supersede it with.",
  computation_changed:
    "The event's payout computation has changed since the latest statement. A superseding statement may only change a winner's status, not the figures, so nothing was issued; decide what the new computation means for anyone already paid first.",
  settlement_changed:
    "The pool or a winner's amount no longer matches the latest statement. A superseding statement may only change a winner's status, so nothing was issued.",
  network_changed:
    "The backend's payout network (GRAINHACK_PAYOUT_NETWORK) has changed since the latest statement, so a statement superseding it can't be issued.",
  payout_run_not_current:
    'The payout computation changed while this page was open (an appeal recompute landed). Reload to see the current figures, then issue again.',
  no_computation: 'The event has no payout computation yet, so there is nothing to put on a statement.',
  nothing_to_settle:
    'There is nothing to settle: the contributor pool is zero or unset, or no submission carried a positive weight.',
  concurrent_issue: 'Another statement was issued for this event at the same moment, so this one was not. Reload to see it.',
  pool_unsupported: 'Only the contributor pool is paid by results statement.',
  grainhack_results_unconfigured:
    "The backend can't sign statements: its results signing key (GRAINHACK_RESULTS_SIGNING_KEY) or payout network (GRAINHACK_PAYOUT_NETWORK) isn't configured.",
  invalid_payout_run_id: "The payout computation id this page sent isn't valid. Reload and issue again.",
};

const RAIL_NAME: Record<string, string> = { keeperhub: 'KeeperHub (Base)', aptos: 'Aptos' };

/** Why the backend refused to issue, in words for the admin. An unknown code
 *  is named so it can be looked up. */
export function statementRefusal(code: string, data?: Record<string, unknown>): StatementRefusal {
  const detail = typeof data?.detail === 'string' && data.detail ? data.detail : null;
  const winners = Array.isArray(data?.winners) ? (data.winners as WinnerWithoutGitHub[]) : [];
  let message = REFUSAL[code] ?? `The statement wasn't issued${code ? ` (${code})` : ''}.`;
  if (code === 'paid_on_other_rail' && typeof data?.rail === 'string') {
    message = `This pool is already being paid on the ${RAIL_NAME[data.rail] ?? data.rail} rail, so nothing was issued. An event pool is paid on one rail only.`;
  }
  return { code, message, detail, winners };
}

/** "@a / @b" for a winner without GitHub, or their user id when no login was recorded. */
export function winnerWithoutGitHubName(w: WinnerWithoutGitHub): string {
  return w.verdict_logins?.length ? w.verdict_logins.map((l) => `@${l}`).join(' / ') : `user ${shortUuid(w.user_id)}`;
}

export function shortUuid(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}
