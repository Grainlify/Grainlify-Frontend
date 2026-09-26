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
 * The agent's own subdomain, not its railway.app host.
 *
 * Wallet extensions and ad-block filter lists commonly block *.railway.app.
 * When they do, the browser's fetch throws before the request leaves, so there
 * is no status, no CORS error and nothing in the agent's logs -- it looks
 * exactly like the service being down. That cost three rounds of diagnosis on
 * the wallet card, and it would have hit contributors hardest, since the people
 * taking these bounties are the most likely to run a wallet extension.
 */
export const BOUNTY_AGENT_URL: string =
  (import.meta.env.VITE_BOUNTY_AGENT_URL as string | undefined) || 'https://agent.grainlify.com';

export interface BountyAgentStatus {
  network: string;
  mainnetLive: boolean;
  inferenceMode: 'mock' | 'live';
  /** Written by the agent from its running configuration. Shown verbatim so the page never claims more than is true. */
  statusLine: string;
}

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
    res = await fetch(`${BOUNTY_AGENT_URL}/link/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
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
    res = await fetch(`${BOUNTY_AGENT_URL}/link/session/read`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
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
