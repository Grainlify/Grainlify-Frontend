import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, ScrollText } from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import { getBounties, type BountyAgentStatus, type PublicBounty } from '../../../shared/api/bountyAgent';
import { StatusNotice } from '../components/StatusNotice';
import { ConnectedWallet } from '../components/ConnectedWallet';
import { BountyRow } from '../components/BountyRow';

interface BountiesProgramPageProps {
  /** Where "Open the ledger" goes: the dashboard subtab, or the public page. */
  ledgerHref: string;
}

/** Grainlify Bounties, presented the way the GrainHack program is: the same
 * header, list card and rows (GrainHackEventsPage / GrainHackEventDetailPage),
 * with bounty content. Separate from GrainHack and from the KeeperHub payout
 * programme; it reads from the bounty agent, not this backend. */
export function BountiesProgramPage({ ledgerHref }: BountiesProgramPageProps) {
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const isDark = theme === 'dark';
  // A button that can only produce "connect GitHub first" is worse than one
  // that says so before it is pressed.
  const canApply = Boolean(isAuthenticated && user?.github?.login);

  const [isLoading, setIsLoading] = useState(true);
  const [bounties, setBounties] = useState<PublicBounty[]>([]);
  const [status, setStatus] = useState<BountyAgentStatus | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setLoadError(null);
    getBounties()
      .then((res) => {
        if (!mounted) return;
        setBounties(res.bounties);
        setStatus(res.status);
      })
      .catch((error) => {
        if (!mounted) return;
        // Recorded rather than shown as "no bounties": an outage is not an empty programme.
        setBounties([]);
        setLoadError(error);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [attempt]);

  const open = bounties.filter((b) => b.status !== 'paid');
  const paid = bounties.filter((b) => b.status === 'paid');
  const card = `rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`;
  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const eyebrow = `text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-[#b8a898]' : 'text-[#9a8b7a]'}`;

  const renderRow = (b: PublicBounty) => (
    <BountyRow key={b.id} bounty={b} isDark={isDark} canApply={canApply} onApplied={() => setAttempt((n) => n + 1)} />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-0 text-center sm:text-left">
        <div>
          <p className={`${eyebrow} mb-1`}>Grainlify Bounties</p>
          <h1 className={`text-[24px] sm:text-[32px] font-bold mb-2 transition-colors ${strong}`}>Open bounties</h1>
          <p className={`text-[14px] sm:text-[16px] max-w-2xl transition-colors ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
            Fixed bounties on open-source issues, funded by GRAIN creator fees. An agent prices each issue and reviews the pull request; a maintainer merges and a person approves every payout.
          </p>
        </div>
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#c9983a] to-[#a67c2e] flex items-center justify-center shadow-[0_8px_24px_rgba(162,121,44,0.3)] border border-white/15 shrink-0">
          <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
      </div>

      <StatusNotice status={status} paidOnMainnet={bounties.some((b) => b.status === 'paid' && b.network === 'solana-mainnet')} />

      <ConnectedWallet />

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to={ledgerHref}
          className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-[12px] border text-[13px] font-medium transition-colors ${
            isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4] hover:bg-white/[0.10]' : 'border-black/15 bg-white/[0.20] text-[#2d2820] hover:bg-white/[0.30]'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          Open the ledger
        </Link>
      </div>

      {isLoading ? (
        <div className={`${card} p-6 sm:p-8`}>
          <div className="animate-pulse space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-[12px] shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                  <div className={`h-3 w-1/3 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : loadError ? (
        <LoadFailed what="bounties" error={loadError} onRetry={() => setAttempt((n) => n + 1)} />
      ) : (
        <>
          <div className={`${card} p-4 sm:p-5`}>
            <p className={`${eyebrow} mb-3`}>
              {open.length} bount{open.length === 1 ? 'y' : 'ies'} open
            </p>
            {open.length === 0 ? (
              <p className={`text-[13.5px] py-2 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
                No bounty is open right now. New ones appear here when they are posted, with a window to apply in.
              </p>
            ) : (
              <div className="space-y-2">{open.map(renderRow)}</div>
            )}
          </div>

          {paid.length > 0 && (
            <div className={`${card} p-4 sm:p-5`}>
              <p className={`${eyebrow} mb-3`}>Paid</p>
              <div className="space-y-2">{paid.map(renderRow)}</div>
            </div>
          )}
        </>
      )}

      <div className={`${card} p-5 sm:p-6`}>
        <h2 className={`text-[15px] font-bold mb-3 ${strong}`}>How to claim a bounty</h2>
        <ol className={`space-y-2 text-[13.5px] leading-[1.55] list-decimal pl-5 ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a4038]'}`}>
          <li>Link a Solana wallet to your GitHub account once. A phone wallet is enough.</li>
          <li>
            Apply here while the bounty's window is open — six hours by default. Do not open a pull request yet, and there is no need to
            comment on the issue.
          </li>
          <li>When the window closes, one applicant is drawn and assigned. You will see who won on this page.</li>
          <li>If you are drawn, open a pull request that says <code className="font-mono text-[12.5px]">Closes #N</code> before the deadline shown on the bounty.</li>
          <li>The agent posts an advisory review. A maintainer decides whether to merge.</li>
          <li>After the merge, a person approves the payout and it is sent to your wallet.</li>
        </ol>

        <h3 className={`text-[13.5px] font-bold mt-5 mb-2 ${strong}`}>How the draw works</h3>
        <p className={`text-[13px] leading-[1.55] ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a4038]'}`}>
          It is weighted, not first-come. Applying early gives you no advantage, and applying to more bounties does not improve your odds on
          any of them. Everyone starts with the same ticket; it is multiplied by how well the issue matches what you have done before, by a
          bonus if you have never been assigned a bounty, by a bonus per bounty you have completed (capped, so wins cannot compound
          indefinitely), and reduced if you have been assigned a bounty and gone silent. A pull request that is reviewed and rejected is not
          counted against you.
        </p>
        <p className={`mt-2 text-[13px] leading-[1.55] ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a4038]'}`}>
          What the draw cannot see: your follower count, your stars, how many pull requests you have opened anywhere, and how well your
          application is written. There is no code path that reads them.
        </p>
        <p className={`mt-2 text-[13px] leading-[1.55] ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a4038]'}`}>
          Every draw stores its seed and the full ticket breakdown, so a result can be recomputed rather than argued about. How many people
          applied is not published while a window is open — otherwise the draw becomes something to time.
        </p>

        <p className={`mt-4 text-[12.5px] ${muted}`}>
          One wallet per GitHub account, and one bounty at a time. Accounts must be at least 30 days old. Maintainers of a repository cannot
          win its bounties. Self-merged pull requests are not paid. Every payout is approved by a person before it is sent.
        </p>
      </div>

    </div>
  );
}
