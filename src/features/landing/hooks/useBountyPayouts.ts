import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { getBountyLedger } from '../../../shared/api/bountyAgent';

/**
 * How many bounties have been paid, read from the agent's public ledger.
 *
 * Live rather than written into the page: "no bounty has been paid yet" is
 * true on the day it is written and false the day the first payout lands, and
 * a sentence nobody remembers to edit is how a page ends up claiming what is
 * no longer true. The ledger is the same record the Bounties pages show.
 */
export type BountyPayouts =
  | { state: 'loading' }
  | { state: 'error' }
  | {
      state: 'ok';
      mainnetLive: boolean;
      paidMainnet: number;
      /** Dollars spent on inference so far, and the lifetime cap. */
      inferenceSpendUsd: number | null;
      inferenceCeilingUsd: number;
    };

function useLedgerFetch(enabled: boolean): BountyPayouts {
  const [result, setResult] = useState<BountyPayouts>({ state: 'loading' });

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    getBountyLedger()
      .then((ledger) => {
        if (!live) return;
        setResult({
          state: 'ok',
          mainnetLive: ledger.status.mainnetLive,
          paidMainnet: ledger.totals.bountiesPaidMainnet,
          inferenceSpendUsd: ledger.totals.inferenceSpendMicro === null ? null : ledger.totals.inferenceSpendMicro / 1e6,
          inferenceCeilingUsd: ledger.totals.inferenceCeilingMicro / 1e6,
        });
      })
      .catch(() => {
        if (live) setResult({ state: 'error' });
      });
    return () => {
      live = false;
    };
  }, [enabled]);

  return result;
}

const BountyPayoutsContext = createContext<BountyPayouts | null>(null);

/** One ledger fetch for the whole landing page, however many sections read it. */
export function BountyPayoutsProvider({ children }: { children: ReactNode }) {
  const value = useLedgerFetch(true);
  return createElement(BountyPayoutsContext.Provider, { value }, children);
}

/** The provider's result when there is one; otherwise this component fetches its own. */
export function useBountyPayouts(): BountyPayouts {
  const shared = useContext(BountyPayoutsContext);
  const own = useLedgerFetch(shared === null);
  return shared ?? own;
}

/** One sentence on what the bounty programme has paid, true in every state. */
export function bountyPayoutLine(p: BountyPayouts): string {
  if (p.state === 'loading') return 'Checking the ledger…';
  if (p.state === 'error') return 'The payout count could not be loaded; the ledger has it.';
  if (!p.mainnetLive) return 'Not live on mainnet right now.';
  if (p.paidMainnet === 0) return 'Live. No bounty has been paid yet.';
  return `Live. ${p.paidMainnet} ${p.paidMainnet === 1 ? 'bounty' : 'bounties'} paid so far.`;
}
