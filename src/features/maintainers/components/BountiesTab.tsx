import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import { formatBountyAmount, getBounties, type PublicBounty } from '../../../shared/api/bountyAgent';
import { BountyApplications } from './BountyApplications';

/** Bounties on the repositories this maintainer selected, and who applied.
 *
 *  Read-only by design, and the panel below says so. The GrainHack tab next
 *  door lets a maintainer accept and reject; this one cannot, because the
 *  draw assigns. */
export function BountiesTab({ repoFullNames, isLoadingProjects }: { repoFullNames: string[]; isLoadingProjects: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [bounties, setBounties] = useState<PublicBounty[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setLoadError(null);
    getBounties()
      .then((r) => live && setBounties(r?.bounties ?? []))
      .catch((e) => live && setLoadError(e));
    return () => {
      live = false;
    };
  }, [attempt]);

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const card = `rounded-[20px] border p-5 ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`;

  if (loadError) return <LoadFailed what="bounties on your repositories" error={loadError} onRetry={() => setAttempt((n) => n + 1)} />;

  const loading = isLoadingProjects || bounties === null;
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

  const lower = repoFullNames.map((r) => r.toLowerCase());
  const mine = bounties.filter((b) => lower.includes(b.repo.toLowerCase()));

  return (
    <div className="p-4 space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Coins className={`w-4 h-4 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`} />
          <h2 className={`text-[16px] font-bold ${strong}`}>Bounties on your repositories</h2>
        </div>
        <p className={`text-[13px] ${muted}`}>
          You can see who applied and how the draw went. You cannot assign, reject, or influence it — that is what makes the draw worth
          trusting. Issues you assign yourself are on the Issues tab and work the way they always have.
        </p>
      </div>

      {mine.length === 0 ? (
        <div className={card}>
          <p className={`text-[13.5px] ${muted}`}>
            No bounties on the repositories you have selected. Bounties are posted by the agent on projects an admin has switched on.
          </p>
        </div>
      ) : (
        mine.map((b) => (
          <div key={b.id} className={card}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <p className={`text-[14px] font-semibold ${strong}`}>{b.issueTitle || `Issue #${b.issueNumber}`}</p>
              <span className={`text-[15px] font-extrabold tabular-nums ${strong}`}>{formatBountyAmount(b)}</span>
            </div>
            <BountyApplications bountyId={b.id} repo={b.repo} />
          </div>
        ))
      )}
    </div>
  );
}
