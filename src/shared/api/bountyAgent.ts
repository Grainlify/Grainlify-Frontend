/**
 * Client for the Grainlify bounty agent.
 *
 * The agent is a separate service (repo Grainlify/grainlify-bounty-agent, its
 * own Railway project), not this backend: it prices and reviews bounties and
 * pays them on Solana. Its public API is read-only; the one write, linking a
 * wallet, is authorised by two signatures in the body (Grainlify's and the
 * wallet's), never by a token. Only grainlify.com origins get CORS.
 */

/**
 * Same origin, through a proxy, deliberately.
 *
 * Every cross-origin call to the agent had to survive CORS, and in a browser
 * running wallet extensions it did not. The extensions re-issue the page's
 * fetch from their own context: the Origin changes or disappears, headers get
 * added, and the browser then refuses to let the page read a reply the server
 * had already sent correctly. It was diagnosed three times as "the agent is
 * unreachable" while the agent was answering 400 with the right headers.
 *
 * `/agent/*` is rewritten to the agent by vercel.json, so the browser sees a
 * same-origin request: no preflight, no Origin check, no allow-list, nothing
 * for an extension to break. The CORS headers on the agent remain correct for
 * anyone calling it directly; this simply stops depending on them.
 *
 * VITE_BOUNTY_AGENT_URL overrides in development only, for pointing a local
 * build at a local agent. A production build ALWAYS uses the same-origin
 * proxy, deliberately: the variable was set to the agent's absolute URL in
 * Vercel at one point, which silently put every production request back on the
 * cross-origin path this proxy exists to avoid, and the symptom was identical
 * to the bug it was meant to fix. A deployment setting should not be able to
 * reintroduce it.
 */
export const BOUNTY_AGENT_URL: string = import.meta.env.DEV
  ? (import.meta.env.VITE_BOUNTY_AGENT_URL as string | undefined) || '/agent'
  : '/agent';

export interface BountyAgentStatus {
  network: string;
  mainnetLive: boolean;
  inferenceMode: 'mock' | 'live';
  /** Written by the agent from its running configuration. Shown verbatim so the page never claims more than is true. */
  statusLine: string;
}

export type BountyHistoryEntry =
  | { kind: 'draw'; at: string; by: string; drawn: string | null }
  | { kind: 'unassign'; at: string; by: string; contributor: string }
  // A bounty put back to open because the pull request on it closed without
  // merging. Sent by the agent from the release that records it; until then
  // there are none.
  | { kind: 'reopened'; at: string; by: string; reason: string; prNumber: number | null; contributor: string | null };

export interface PublicBounty {
  id: string;
  repo: string;
  issueNumber: number;
  issueTitle: string | null;
  issueUrl: string;
  amountMinor: string;
  decimals: number;
  currency: string;
  network: string;
  status: 'posted' | 'in_review' | 'payable' | 'paid' | string;
  postedAt: string;
  payout: { txSignature: string; txUrl: string; paidAt: string; recipientLogin: string } | null;
  /** A bounty that exists to exercise the pipeline. Always shown as such. */
  isTest: boolean;
  /** Eligibility rules this bounty waives, by name. Public on purpose: a
   *  relaxed rule nobody can see is indistinguishable from one that is broken. */
  waivedRules: string[];
  applicationsOpenAt: string | null;
  applicationsCloseAt: string | null;
  applicationState: 'none' | 'open' | 'closed';
  /** Who holds it now. How many applied is deliberately not published. */
  assignedTo: string | null;
  assignmentStaleAt: string | null;
  /** Every real draw and unassign, oldest first - public so that redrawing until
   *  a preferred contributor wins happens in plain sight. Optional: an older
   *  agent does not send it. */
  history?: BountyHistoryEntry[];
  /** Only contributors with no completed bounty can win it. */
  reservedForNewcomers: boolean;
  /** Coarse band while a window is open; null when hidden or once closed. */
  applicantBucket: 'none' | 'few' | 'many' | null;
  /** Exact size, released once the window closes. */
  applicantCount: number | null;
  /** A maintainer-funded bounty: who funded it, how it is assigned, the escrow
   *  anyone can read, and the funder's public record. Optional: an older agent
   *  does not send it. */
  funded?: {
    by: string;
    mode: 'draw' | 'self_assign';
    escrow: string;
    escrowUrl: string;
    deadlineAt: string;
    profile: FunderRecord | null;
  } | null;
}

/** A funder's public record: three numbers side by side, because one alone misleads. */
export interface FunderRecord {
  bountiesFunded: number;
  unassignedBeforePr: number;
  disputesRaised: number;
}

export type LedgerEventKind = 'bounty_posted' | 'inference' | 'gate_passed' | 'gate_refused' | 'payout';

export interface LedgerEvent {
  at: string;
  kind: LedgerEventKind;
  /** The bounty this event served; lets a page show one bounty's receipt chain. */
  bountyId: string | null;
  /** Devnet or mock: no real value moved. */
  test: boolean;
  detail: string;
  amount: string | null;
  proof: { label: string; url: string | null };
}

export interface BountyLedger {
  status: BountyAgentStatus;
  totals: {
    bountiesPosted: number;
    bountiesPaidMainnet: number;
    bountiesPaidTest: number;
    inferenceCalls: number;
    /** null while inference runs against the mock gateway: there is no real spend yet. */
    inferenceSpendMicro: number | null;
    inferenceCeilingMicro: number;
    /** null until GRAIN launches and fees are tracked. */
    feesInMicro: number | null;
  };
  budget: { phase: string; allocationMicro: number; spentMicro: number }[];
  events: LedgerEvent[];
}

export class BountyAgentError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'BountyAgentError';
  }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BOUNTY_AGENT_URL}${path}`, { headers: { accept: 'application/json' } });
  } catch {
    throw new BountyAgentError(0, 'The bounty agent could not be reached.');
  }
  if (!res.ok) throw new BountyAgentError(res.status, `The bounty agent answered ${res.status}.`);
  return (await res.json()) as T;
}

export const getBounties = () => get<{ status: BountyAgentStatus; bounties: PublicBounty[] }>('/public/bounties');
export const getBounty = (id: string) => get<{ status: BountyAgentStatus; bounty: PublicBounty }>(`/public/bounties/${encodeURIComponent(id)}`);
export const getBountyLedger = () => get<BountyLedger>('/public/ledger');

export interface BountyRuleSetting {
  key: string;
  type: string;
  section: string;
  description: string;
  default: string;
  value: string;
  overridden: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface BountyRules {
  status: BountyAgentStatus;
  structural: {
    priorCompletionCap: number;
    priorCompletionCapNote: string;
    neverWeighted: string[];
    neverWeightedNote: string;
  };
  sections: string[];
  settings: BountyRuleSetting[];
}

/** The odds, published. Unauthenticated: a rule you must sign in to read is
 *  not really published. */
export const getBountyRules = () => get<BountyRules>('/public/rules');

/**
 * text/plain, deliberately, on every POST to the agent.
 *
 * application/json makes a cross-origin POST a "preflighted" request: the
 * browser sends an OPTIONS first and refuses to send the real request unless
 * that succeeds. A wallet extension sitting in the request path can break that
 * exchange, and when it does the page sees "No 'Access-Control-Allow-Origin'
 * header is present" even though the server sent one -- which is exactly what
 * happened on the wallet card, with the preflight verifiably correct from curl
 * and from a clean browser.
 *
 * text/plain is on the short list of content types that make a POST a simple
 * request, so there is no preflight to intercept. The agent never reads the
 * content type; it reads the raw body and parses it as JSON.
 */
const AGENT_POST = { 'content-type': 'text/plain' } as const;

export interface LinkedWallet {
  linked: true;
  wallet: string;
  githubLogin: string;
  replaced: string | null;
  unchanged: boolean;
}

/** Why the agent refused a link, in words for the person who asked. */
const LINK_REFUSALS: Record<string, string> = {
  expired: 'That request expired before it was signed. Start again; it takes a few seconds.',
  nonce_used: 'That request was already used. Start again to get a fresh one.',
  wallet_linked_to_another_account: 'That wallet is already linked to another GitHub account. Use a different wallet, or unlink it from the other account first.',
  bad_wallet_signature: 'The signature did not match this wallet. Try again from the same wallet.',
  bad_countersignature: 'Grainlify could not confirm who you are. Sign in again and retry.',
  session_links_off: 'Wallet linking is switched off right now. Try again later.',
};

/** Stores the link: Grainlify's countersigned message plus the wallet's signature over it. */
export async function linkWalletFromSession(body: { message: string; countersignature: string; walletSignature: string }): Promise<LinkedWallet> {
  let res: Response;
  try {
    res = await fetch(`${BOUNTY_AGENT_URL}/link/session`, { method: 'POST', headers: AGENT_POST, body: JSON.stringify(body) });
  } catch {
    throw new BountyAgentError(0, 'The bounty agent could not be reached.');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & Partial<LinkedWallet>;
  if (!res.ok) throw new BountyAgentError(res.status, LINK_REFUSALS[data.error ?? ''] ?? `The bounty agent answered ${res.status}.`);
  return data as LinkedWallet;
}

export interface WalletLinkState {
  linked: boolean;
  wallet: string | null;
  linkedAt: string | null;
  githubLogin: string;
}

/** Reads the caller's own link. Never throws for "no link": that is an answer,
 *  not a failure, and the page needs to tell the two apart. */
export async function readWalletLink(body: { message: string; countersignature: string }): Promise<WalletLinkState> {
  let res: Response;
  try {
    res = await fetch(`${BOUNTY_AGENT_URL}/link/session/read`, { method: 'POST', headers: AGENT_POST, body: JSON.stringify(body) });
  } catch {
    throw new BountyAgentError(0, 'The bounty agent could not be reached.');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & Partial<WalletLinkState>;
  if (!res.ok) throw new BountyAgentError(res.status, LINK_REFUSALS[data.error ?? ''] ?? `The bounty agent answered ${res.status}.`);
  return { linked: data.linked === true, wallet: data.wallet ?? null, linkedAt: data.linkedAt ?? null, githubLogin: data.githubLogin ?? '' };
}

/** "20 USDC" on mainnet, "20 test USDC" anywhere else: devnet tokens have no value and must say so. */
export function formatBountyAmount(b: Pick<PublicBounty, 'amountMinor' | 'decimals' | 'currency' | 'network'>): string {
  const n = Number(b.amountMinor) / 10 ** b.decimals;
  const amount = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${amount} ${b.network === 'solana-mainnet' ? b.currency : `test ${b.currency}`}`;
}

export function formatMicroUsd(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(2)}`;
}
