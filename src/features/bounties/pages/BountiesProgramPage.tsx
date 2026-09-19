import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, ExternalLink, Wallet, ScrollText } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import { formatBountyAmount, getBounties, type BountyAgentStatus, type PublicBounty } from '../../../shared/api/bountyAgent';
import { StatusNotice } from '../components/StatusNotice';

const STATUS_LABELS: Record<string, string> = {
  posted: 'Open',
  in_review: 'PR in review',
  payable: 'Awaiting approval',
  paid: 'Paid',
};

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
  const isDark = theme === 'dark';

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
  const row = `flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[16px] border transition-all ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'}`;
  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const eyebrow = `text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-[#b8a898]' : 'text-[#9a8b7a]'}`;
  const pill = `px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${isDark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#8b6f3a]'}`;

  const renderRow = (b: PublicBounty) => (
    <div key={b.id} className={row}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[14.5px] font-semibold ${strong}`}>{b.issueTitle || `Issue #${b.issueNumber}`}</span>
          <span className={pill}>{STATUS_LABELS[b.status] ?? b.status}</span>
        </div>
        <p className={`text-[12.5px] ${muted}`}>
          {b.repo} #{b.issueNumber}
          {b.payout && (
            <>
              {' · paid to '}
              {b.payout.recipientLogin}
              {' · '}
              <a href={b.payout.txUrl} target="_blank" rel="noreferrer" className={`underline underline-offset-2 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`}>
                transaction
              </a>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
        <span className={`text-[16px] font-extrabold tabular-nums ${strong}`}>{formatBountyAmount(b)}</span>
        <a
          href={b.issueUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.4)] transition-all border border-white/10"
        >
          View issue
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
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

      <StatusNotice status={status} />

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/bounties/link"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13.5px] shadow-[0_4px_14px_rgba(162,121,44,0.35)] hover:shadow-[0_6px_20px_rgba(162,121,44,0.45)] transition-all border border-white/10"
        >
          <Wallet className="w-4 h-4" />
          Link your wallet
        </Link>
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
                No bounty is open right now. New ones are posted as comments on the issues themselves, and appear here.
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
          <li>Open a pull request that says <code className="font-mono text-[12.5px]">Closes #N</code> for the bounty issue.</li>
          <li>The agent posts an advisory review. A maintainer decides whether to merge.</li>
          <li>After the merge, a person approves the payout and it is sent to your wallet.</li>
        </ol>
        <p className={`mt-3 text-[12.5px] ${muted}`}>
          One wallet per GitHub account. Accounts must be at least 30 days old. Self-merged pull requests are not paid. Up to $50 per bounty.
        </p>
      </div>
    </div>
  );
}
