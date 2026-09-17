import type { KeeperHubLeg, KeeperHubLegStatus, KeeperHubRunView } from '../../../../shared/api/client';

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
