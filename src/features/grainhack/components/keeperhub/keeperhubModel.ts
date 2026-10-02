import type { HackathonSettlementPreview, KeeperHubLeg, KeeperHubLegStatus, KeeperHubRunView, LatestPayoutRun } from '../../../../shared/api/client';

/** Presentation rules for the KeeperHub payout panel, kept out of the component
 *  so each can be tested on its own.
 *
 *  # No totals
 *
 *  Nothing here adds amounts across leg statuses. The backend returns one
 *  count and one sum per status and deliberately no "paid" or "remaining"
 *  figure: a leg in `unknown` may or may not have paid, and folding it into
 *  either side would state something nobody knows. The one sum computed here is
 *  over exclusions, which are not legs and are named as such wherever shown.
 */

/** Integer minor units as a decimal string, never rounded. */
export function formatMinor(minor: string, decimals: number | null, symbol: string | null): string {
  if (decimals === null || !/^-?\d+$/.test(minor)) {
    // No decimals on the chain row: say what the number is rather than guess.
    return `${minor} minor units`;
  }
  const negative = minor.startsWith('-');
  const digits = (negative ? minor.slice(1) : minor).padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals).replace(/^0+(?=\d)/, '');
  const frac = decimals > 0 ? `.${digits.slice(digits.length - decimals)}` : '';
  const value = minor === '0' ? '0' : `${negative ? '-' : ''}${whole}${frac}`;
  return symbol ? `${value} ${symbol}` : value;
}

export function sumMinor(values: string[]): string {
  return values.reduce((acc, v) => acc + BigInt(v), 0n).toString();
}

/** The five statuses, in the order the tiles show them. */
export const STATUS_ORDER: KeeperHubLegStatus[] = ['confirmed', 'unknown', 'failed', 'dispatched', 'pending'];

export const STATUS_LABEL: Record<KeeperHubLegStatus, string> = {
  confirmed: 'Paid',
  unknown: 'May have paid',
  failed: 'Failed',
  dispatched: 'Awaiting result',
  pending: 'Pending',
};

export type Tone = 'green' | 'amber' | 'red' | 'neutral';

export const STATUS_TONE: Record<KeeperHubLegStatus, Tone> = {
  confirmed: 'green',
  unknown: 'amber',
  failed: 'red',
  dispatched: 'neutral',
  pending: 'neutral',
};

export function statusTotals(view: KeeperHubRunView, status: KeeperHubLegStatus) {
  // by_status names every status; a missing key would be a backend change, so
  // it reads as zero legs rather than breaking the panel.
  return view.derived_from_legs.by_status[status] ?? { count: 0, amount_minor: '0' };
}

/** The tile's second line, after the amount. */
export function statusHint(status: KeeperHubLegStatus, count: number): string | null {
  switch (status) {
    case 'confirmed':
      return 'confirmed on chain';
    case 'unknown':
      return count === 0 ? 'nothing blocks a resend' : 'neither paid nor unpaid yet';
    case 'failed':
      return 'resendable';
    default:
      return null;
  }
}

export function legName(leg: { github_login: string | null }): string {
  return leg.github_login ? `@${leg.github_login}` : 'No linked GitHub account';
}

export function shortAddress(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function shortHash(h: string): string {
  return h.length > 16 ? `${h.slice(0, 10)}…${h.slice(-4)}` : h;
}

export function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

/** "Basescan" for basescan.org and sepolia.basescan.org; otherwise the host. */
export function explorerLabel(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host === 'basescan.org' || host.endsWith('.basescan.org')) return 'Basescan';
    return host;
  } catch {
    return 'Explorer';
  }
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "@a's leg" / "@a's and @b's legs" / "3 legs". */
export function whoseLegs(legs: KeeperHubLeg[]): string {
  const names = legs.map((l) => (l.github_login ? `@${l.github_login}'s` : null));
  if (legs.length === 0) return 'no legs';
  if (names.some((n) => n === null) || legs.length > 3) return plural(legs.length, 'leg', 'legs');
  if (names.length === 1) return `${names[0]} leg`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} legs`;
}

export interface NonClosure {
  unknownMinor: string;
  dispatchedMinor: string;
  excludedMinor: string;
  unknownLegs: KeeperHubLeg[];
  dispatchedLegs: KeeperHubLeg[];
}

/** When the status sums cannot be read as "the pool, split up": some money is
 *  in a leg whose outcome nobody knows yet. Null when every leg has a known or
 *  not-yet-sent outcome - then the plain caption is enough. */
export function nonClosure(view: KeeperHubRunView): NonClosure | null {
  const unknownLegs = view.legs.filter((l) => l.status === 'unknown');
  const dispatchedLegs = view.legs.filter((l) => l.status === 'dispatched');
  if (unknownLegs.length === 0 && dispatchedLegs.length === 0) return null;
  return {
    unknownMinor: statusTotals(view, 'unknown').amount_minor,
    dispatchedMinor: statusTotals(view, 'dispatched').amount_minor,
    excludedMinor: sumMinor(view.exclusions.map((e) => e.amount_minor)),
    unknownLegs,
    dispatchedLegs,
  };
}

export type SendState =
  | { kind: 'allowed' }
  | { kind: 'not_configured' }
  | { kind: 'may_have_paid' }
  | { kind: 'awaiting_result' }
  | { kind: 'run_failed' }
  | { kind: 'nothing_unpaid' }
  | { kind: 'other'; reason: string };

/** What replaces the send box, from resume.reason and the legs behind it. */
export function sendState(view: KeeperHubRunView): SendState {
  const { resume } = view;
  if (resume.allowed) return { kind: 'allowed' };
  switch (resume.reason) {
    case 'keeperhub_not_configured':
      return { kind: 'not_configured' };
    case 'unreconciled_legs':
      return view.legs.some((l) => l.status === 'unknown') ? { kind: 'may_have_paid' } : { kind: 'awaiting_result' };
    case 'run_failed':
      return { kind: 'run_failed' };
    case 'nothing_unpaid':
      return { kind: 'nothing_unpaid' };
    default:
      return { kind: 'other', reason: resume.reason || 'refused' };
  }
}

export const ATTEMPT_STATE_LABEL: Record<string, string> = {
  sending: 'Sending',
  sent: 'Accepted · results not read',
  unacknowledged: 'No acknowledgement',
  rejected: 'Rejected by KeeperHub',
  reconciled: 'Results read',
  mismatch: 'Execution mismatch',
};

export const EXCLUSION_REASON: Record<string, string> = {
  no_address: 'No verified Base payout address when the run was prepared',
  no_github_account: 'No linked GitHub account when the run was prepared',
  kyc_unresolved: 'Identity check unresolved when the run was prepared',
};

/** The attempt a dispatched leg is waiting on, newest first. */
export function attemptsAwaitingRead(view: KeeperHubRunView) {
  const waiting = new Set(view.legs.filter((l) => l.status === 'dispatched').map((l) => l.last_attempt_id));
  return view.attempts.filter((a) => waiting.has(a.id)).sort((a, b) => b.ordinal - a.ordinal);
}

// ---- the first release -------------------------------------------------------

/** The EVM chains a KeeperHub run can pay on, as chain_configs seeds them
 *  (Grainlify-Backend migrations 20260916090100 and 20260916090600). There is
 *  no endpoint listing chain configs, so these are mirrored here; a chain the
 *  server doesn't have is refused by release with chain_not_evm. */
export interface PayoutNetwork {
  chainId: string;
  name: string;
  network: 'testnet' | 'mainnet';
  evmChainId: number;
  asset: string;
}

export const PAYOUT_NETWORKS: PayoutNetwork[] = [
  { chainId: 'base-sepolia', name: 'Base Sepolia', network: 'testnet', evmChainId: 84532, asset: 'test USDC' },
  { chainId: 'base', name: 'Base', network: 'mainnet', evmChainId: 8453, asset: 'USDC' },
];

export function payoutNetwork(chainId: string): PayoutNetwork | undefined {
  return PAYOUT_NETWORKS.find((n) => n.chainId === chainId);
}

/** "Base Sepolia (testnet, chain 84532)". */
export function networkLabel(n: PayoutNetwork): string {
  return `${n.name} (${n.network}, chain ${n.evmChainId})`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return UUID_RE.test(v.trim());
}

export const PHASE_LABEL: Record<string, string> = {
  draft: 'Draft',
  application_period: 'Application period',
  issue_prep: 'Issue prep',
  live: 'Live',
  closed: 'Closed',
  results_published: 'Results published',
  settled: 'Settled',
};

export type StartState =
  | { kind: 'phase_unknown' }
  | { kind: 'not_settled'; phase: string }
  | { kind: 'no_computation' }
  | { kind: 'loading' }
  | { kind: 'preview_failed'; code: string }
  | { kind: 'nothing_to_settle'; reason: string }
  | { kind: 'settled_on_aptos'; settlementId: string | null }
  | { kind: 'does_not_sum' }
  | { kind: 'ready'; preview: Extract<HackathonSettlementPreview, { lines: unknown }> };

/** Whether "Start payout" can be offered when an event has no run yet.
 *
 *  Only the checks the frontend can see. Shadow mode, the appeal window being
 *  closed out, the computation being current, KYC, addresses and the wallet's
 *  balance are checked by release itself, and each refusal is mapped by
 *  releaseFailure. */
export function startState(
  phase: string | undefined,
  preview: HackathonSettlementPreview | undefined,
  previewError: string | null,
  latestPayoutRun?: LatestPayoutRun,
): StartState {
  if (!phase) return { kind: 'phase_unknown' };
  if (phase !== 'settled') return { kind: 'not_settled', phase };
  // Undefined is an older backend that doesn't report it: the id is typed.
  if (latestPayoutRun && latestPayoutRun.id === null) return { kind: 'no_computation' };
  if (previewError !== null) return { kind: 'preview_failed', code: previewError };
  if (!preview) return { kind: 'loading' };
  if (preview.nothing_to_settle) return { kind: 'nothing_to_settle', reason: preview.reason };
  if (preview.already_settled) return { kind: 'settled_on_aptos', settlementId: preview.settlement_id };
  if (!preview.sums_to_pool) return { kind: 'does_not_sum' };
  return { kind: 'ready', preview };
}

/** One plain sentence for each name release refuses with
 *  (Grainlify-Backend internal/handlers/admin_keeperhub_payout.go keeperhubError).
 *  `starting` is the first release of an event, where the run is planned in
 *  the same call. */
export function releaseFailure(code: string, detail: string, opts: { starting?: boolean } = {}): string {
  switch (code) {
    case 'dispatch_outcome_unknown':
      return "KeeperHub's answer never came back, so the legs in this send may have paid. They are now marked May have paid: check the explorer before anything else.";
    case 'dispatch_rejected':
      return "KeeperHub refused the request, so nothing was sent. The legs stay failed and can be sent once that's fixed.";
    case 'concurrent_release':
      return 'Another send for this run is already in progress. Nothing new was sent.';
    case 'unreconciled_legs':
      return 'Nothing was sent: a leg may have paid or is still awaiting its result.';
    case 'nothing_unpaid':
      return opts.starting
        ? "Nothing was sent: the run was prepared, but nobody in it can be paid yet. Everyone was excluded (no linked GitHub account, identity not verified, or no verified address on this network); they're listed below."
        : 'Nothing was sent: every leg is already paid.';
    case 'keeperhub_not_configured':
      return "Nothing was sent: KeeperHub isn't configured on this server.";
    case 'payout_not_releasable':
      if (/shadow mode/i.test(detail)) {
        return 'Nothing was sent: this event is in shadow mode, which computes payouts but pays nothing. Turn judging_shadow_mode off under Rule overrides for this event first.';
      }
      // Phase first: its detail also mentions the appeal window.
      if (/phase 6|has settled/i.test(detail)) {
        return 'Nothing was sent: payouts start once the event is settled.';
      }
      if (/appeal window has not been closed/i.test(detail)) {
        return "Nothing was sent: the appeal window hasn't been closed out, so the post-appeal amounts haven't been computed yet.";
      }
      return `Nothing was sent: the event isn't ready to pay.${detail ? ` ${detail}` : ''}`;
    case 'invalid_payout_run_id':
      return "Nothing was sent: the computation id isn't a valid id.";
    case 'payout_run_not_current':
      return "Nothing was sent: that isn't this event's current payout computation. An upheld appeal recomputes into a new one; use the newest.";
    case 'run_mismatch':
      return 'Nothing was sent: this event already has a payout run on a different network or computation. Reload to see it.';
    case 'chain_not_evm':
      return "Nothing was sent: that network isn't an enabled EVM chain on this server.";
    case 'settled_on_aptos_rail':
      return "Nothing was sent: this pool is already settled on the Aptos rail, so it can't also be paid through KeeperHub.";
    case 'pool_unsupported':
      return 'Nothing was sent: only the contributor pool is paid through KeeperHub.';
    case 'nothing_to_settle':
      return 'Nothing was sent: there is nothing to pay. No submission carries a positive weight, or the pool is unset.';
    case 'run_failed':
      return 'Nothing was sent: this run has failed and needs a person before anything more is sent.';
    case 'preflight_would_revert':
      return "Nothing was sent: KeeperHub's simulation says a transfer would fail. The usual causes are a payout wallet short of USDC or gas, or a bad address. The legs stay unsent and can be sent once that's fixed.";
    case 'preflight_unavailable':
      return "Nothing was sent: KeeperHub's transfer simulation couldn't be reached, and nothing is sent unsimulated. Try again shortly.";
    case 'chain_mismatch':
      return 'Nothing was sent: a transaction was reported on a different chain than this run pays on. Check the run before anything else.';
    default:
      return `Nothing was sent${code ? ` (${code})` : ''}.${detail ? ` ${detail}` : ''}`;
  }
}
