/**
 * Read-only client for the Grainlify bounty agent's public API.
 *
 * The agent is a separate service (repo Grainlify/grainlify-bounty-agent, its
 * own Railway project), not this backend: it prices and reviews bounties and
 * pays them on Solana. It answers only GET, and only grainlify.com origins get
 * CORS, so nothing here carries a token or can change anything.
 */

export const BOUNTY_AGENT_URL: string =
  (import.meta.env.VITE_BOUNTY_AGENT_URL as string | undefined) || 'https://agent-production-ba74.up.railway.app';

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

/** "20 USDC" on mainnet, "20 test USDC" anywhere else: devnet tokens have no value and must say so. */
export function formatBountyAmount(b: Pick<PublicBounty, 'amountMinor' | 'decimals' | 'currency' | 'network'>): string {
  const n = Number(b.amountMinor) / 10 ** b.decimals;
  const amount = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${amount} ${b.network === 'solana-mainnet' ? b.currency : `test ${b.currency}`}`;
}

export function formatMicroUsd(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(2)}`;
}
