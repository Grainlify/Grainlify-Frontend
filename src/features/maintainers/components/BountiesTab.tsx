import { lazy, Suspense, useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import { formatBountyAmount, getBounties, type PublicBounty } from '../../../shared/api/bountyAgent';
import {
  confirmFundedBounty,
  getFundedStatus,
  getMaintainerBounties,
  getMaintainerBountyView,
  type FundedStatus,
  type MaintainerBountyEntry,
  type MaintainerBountyView,
} from '../../../shared/api/client';
import { BountyApplications } from './BountyApplications';
import { BountyControls } from './BountyControls';

// The funded-bounty screens talk to wallets; loaded only for somebody who can
// fund, so nobody else downloads the wallet code.
const FundBountyPanel = lazy(() => import('./funded/FundBountyPanel').then((m) => ({ default: m.FundBountyPanel })));
const FundedBountyControls = lazy(() => import('./funded/FundedBountyControls').then((m) => ({ default: m.FundedBountyControls })));

/** Bounties on the repositories this maintainer selected, and who applied.
 *
 *  Read-only by design, and the panel below says so. The GrainHack tab next
 *  door lets a maintainer accept and reject; this one cannot, because the
 *  draw assigns. */
export function BountiesTab() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [bounties, setBounties] = useState<PublicBounty[] | null>(null);
  const [entries, setEntries] = useState<MaintainerBountyEntry[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  // Whether this person can fund bounties. Absent (null) means no: the switch
  // is off, they are not a tester, or the agent has no escrow configured -
  // and then there is nothing to show, not a disabled button.
  const [funding, setFunding] = useState<FundedStatus | null>(null);
  const [fundOpen, setFundOpen] = useState(false);

  useEffect(() => {
    let live = true;
    getFundedStatus()
      .then((s) => live && setFunding(s.available ? s : null))
      .catch(() => live && setFunding(null));
    return () => {
      live = false;
    };
  }, []);

  // Which bounties this person may see is the SERVER's answer, from GitHub
  // permission. It used to be a client-side filter of the public list against
  // whichever repositories happened to be ticked in the picker, which meant
  // the tab showed nothing until something was selected and could never show
  // a repository the person maintains but has not registered as a project.
  useEffect(() => {
    let live = true;
    setLoadError(null);
    Promise.all([getMaintainerBounties(), getBounties()])
      .then(([mine, all]) => {
        if (!live) return;
        const ids = new Set((mine?.bounties ?? []).map((b) => b.bountyId));
        setEntries(mine?.bounties ?? []);
        setBounties((all?.bounties ?? []).filter((b) => ids.has(b.id)));
      })
      .catch((e) => live && setLoadError(e));
    return () => {
      live = false;
    };
  }, [attempt]);

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const card = `rounded-[20px] border p-5 ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`;

  if (loadError) return <LoadFailed what="bounties on your repositories" error={loadError} onRetry={() => setAttempt((n) => n + 1)} />;

  const loading = bounties === null;
  if (loading) {
    return (
      <div className={`${card} m-4`} aria-busy="true">
        <div className="animate-pulse space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className={`h-5 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} style={{ width: `${70 - i * 18}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const mine = bounties;
  const byId = new Map(entries.map((e) => [e.bountyId, e]));
  // Funding started and never confirmed: only its funder sees it, and the only
  // thing to do is check the chain again.
  const unconfirmed = entries.filter((e) => e.status === 'funding' && e.youFunded);

  return (
    <div className="p-4 space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Coins className={`w-4 h-4 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`} />
          <h2 className={`text-[16px] font-bold ${strong}`}>Bounties on your repositories</h2>
        </div>
        <p className={`text-[13px] ${muted}`}>
          You can see who applied and how the draw went, run the draw, end an assignment, and move a deadline. You cannot choose who is
          drawn: every draw is the same weighted draw. Each change is recorded, and the contributor is told why. Issues you assign
          yourself are on the Issues tab and work the way they always have.
        </p>
      </div>

      {funding && !fundOpen && (
        <div className={`${card} flex flex-col sm:flex-row sm:items-center gap-3`}>
          <p className={`flex-1 text-[13px] ${muted}`}>
            Put your own money behind an issue on a project you maintain. It is locked in an on-chain escrow before the bounty appears.
            {funding.network !== 'solana-mainnet' && <> Running on <b className={strong}>{funding.network}</b> with test tokens.</>}
          </p>
          <button
            type="button"
            onClick={() => setFundOpen(true)}
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] border border-white/10 shrink-0"
          >
            Fund a bounty
          </button>
        </div>
      )}
      {funding && fundOpen && (
        <Suspense fallback={<div className={`${card} h-40 animate-pulse`} aria-busy="true" />}>
          <FundBountyPanel status={funding} onClose={() => setFundOpen(false)} onFunded={() => { setFundOpen(false); setAttempt((n) => n + 1); }} />
        </Suspense>
      )}

      {unconfirmed.map((e) => (
        <UnconfirmedFunding key={e.bountyId} entry={e} card={card} strong={strong} muted={muted} onConfirmed={() => setAttempt((n) => n + 1)} />
      ))}

      {mine.length === 0 ? (
        <div className={card}>
          <p className={`text-[13.5px] ${muted}`}>
            No bounties on the repositories you maintain. This list is not affected by the repository picker — it shows every repository you
            have write access to on GitHub.
          </p>
        </div>
      ) : (
        mine.map((b) => (
          <div key={b.id} className={card}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <p className={`text-[14px] font-semibold ${strong}`}>{b.issueTitle || `Issue #${b.issueNumber}`}</p>
              <span className={`text-[15px] font-extrabold tabular-nums ${strong}`}>{formatBountyAmount(b)}</span>
            </div>
            {byId.get(b.id)?.youFunded ? (
              <Suspense fallback={<div className="h-24 animate-pulse" aria-busy="true" />}>
                <FundedBountyControls bountyId={b.id} />
              </Suspense>
            ) : byId.get(b.id)?.funded ? (
              <p className={`text-[12.5px] ${muted}`}>
                Funded by a maintainer of this repository, who runs it. Their controls are theirs; you can see it on the Bounties page like anybody else.
              </p>
            ) : (
              <MaintainerBountyCard bountyId={b.id} repo={b.repo} />
            )}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * One bounty: who applied, and the controls for it. One load serves both,
 * and an action reloads it, so the controls always offer what applies now -
 * a held bounty, an open pull request, or one waiting to be drawn.
 */
function MaintainerBountyCard({ bountyId, repo }: { bountyId: string; repo: string }) {
  const [view, setView] = useState<MaintainerBountyView | undefined>(undefined);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    getMaintainerBountyView(bountyId)
      .then((v) => live && setView(v))
      .catch(() => live && setView(undefined));
    return () => {
      live = false;
    };
  }, [bountyId, version]);
  return (
    <div className="space-y-3">
      <BountyApplications bountyId={bountyId} repo={repo} view={view} />
      {view && <BountyControls view={view} onChanged={() => setVersion((n) => n + 1)} />}
    </div>
  );
}

/** A funding that was signed, perhaps, but never confirmed here: the page closed,
 *  or the chain was slow. Confirming reads the chain, so no signature is needed. */
function UnconfirmedFunding({ entry, card, strong, muted, onConfirmed }: {
  entry: MaintainerBountyEntry; card: string; strong: string; muted: string; onConfirmed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = async () => {
    setBusy(true);
    setError(null);
    try {
      await confirmFundedBounty(entry.bountyId);
      onConfirmed();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={card}>
      <p className={`text-[14px] font-semibold ${strong}`}>{entry.issueTitle || `Issue #${entry.issueNumber}`} — funding not confirmed</p>
      <p className={`text-[12.5px] mt-1 mb-3 ${muted}`}>
        {entry.repo} #{entry.issueNumber}. Nobody can see this bounty until the chain shows the funds locked. If you signed the transaction, check again;
        if you did not, fund it again from the button above and this is replaced.
      </p>
      {error && <p role="alert" className="text-[12.5px] mb-2 text-[#c0573f]">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void check()}
        className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-[10px] text-[13px] font-semibold border border-[#c9983a]/50 disabled:opacity-50"
      >
        {busy ? 'Checking the chain…' : 'Check again'}
      </button>
    </div>
  );
}
