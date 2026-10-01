import { useEffect, useState } from 'react';
import { Lock, Eye, Trophy, Info } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { getMaintainerBountyView, type MaintainerBountyView } from '../../../shared/api/client';

const BUCKET: Record<string, string> = {
  none: 'No applicants yet',
  few: 'A few applicants',
  many: 'Many applicants',
};

/**
 * A maintainer looking at applications on their own repository.
 *
 * Two things this screen has to make unmistakable, because both are surprising
 * if you have used the GrainHack review screen next door.
 *
 * There is nothing to click. GrainHack applications are assignable — a
 * maintainer accepts or rejects them. Bounty applications are not: the draw
 * assigns, and a maintainer has no say in it. A screen that merely happens to
 * have no buttons reads as unfinished, so it says so instead.
 *
 * And while applications are open, there are no names. A maintainer has
 * influence over the repository and therefore over the people applying to it;
 * if they could see who had applied while the window was still open, those
 * people could be leaned on or tipped off. The count is coarse until the
 * window closes, at which point exactness harms nothing and the full list
 * appears.
 */
export function BountyApplications({
  bountyId,
  repo,
  view: given,
}: {
  bountyId: string;
  repo: string;
  /** Already loaded by the card, which shares it with the draw controls. */
  view?: MaintainerBountyView;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [view, setView] = useState<MaintainerBountyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (given) {
      setView(given);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setError(null);
    getMaintainerBountyView(bountyId)
      .then((v) => live && setView(v))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [bountyId, repo, given]);

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const card = `rounded-[16px] border p-4 ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'}`;

  if (loading) {
    return (
      <div className={card} aria-busy="true" aria-label="Loading applications">
        <div className="animate-pulse space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className={`h-4 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} style={{ width: `${70 - i * 20}%` }} />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={card}>
        <p role="alert" className={`text-[13px] ${isDark ? 'text-[#f0b4a8]' : 'text-[#8a3a28]'}`}>
          {error}
        </p>
      </div>
    );
  }
  if (!view) return null;

  return (
    <div className={card}>
      <div className="flex items-start gap-2 mb-3">
        <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-[#e8c571]' : 'text-[#5c4214]'}`} />
        {/* The difference from the GrainHack review screen, said plainly. */}
        <p className={`text-[12.5px] leading-[1.5] ${muted}`}>
          <span className={`font-semibold ${strong}`}>This is a view, not a review.</span> Bounties are assigned by a weighted draw. Unlike
          GrainHack applications, there is nothing here to accept or reject, and you cannot choose who is drawn.
        </p>
      </div>

      <p className={`text-[13.5px] font-semibold mb-2 ${strong}`}>
        {view.repo} #{view.issueNumber}
      </p>

      {view.windowOpen ? (
        <div>
          <p className={`flex items-center gap-2 text-[13px] font-medium ${strong}`}>
            <Lock className="w-4 h-4" />
            {view.applicantBucket ? BUCKET[view.applicantBucket] : 'Applications are open'}
          </p>
          <p className={`text-[12.5px] mt-1 ${muted}`}>
            Names are hidden while applications are open, including from you. Seeing who has applied would let applicants be approached
            before the draw, which is the thing the draw exists to prevent. The full list appears
            {view.applicationsCloseAt ? ` when the window closes on ${new Date(view.applicationsCloseAt).toLocaleString()}` : ' when the window closes'}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className={`flex items-center gap-2 text-[13px] font-medium mb-2 ${strong}`}>
              <Eye className="w-4 h-4" />
              {view.applicantCount} {view.applicantCount === 1 ? 'applicant' : 'applicants'}
            </p>
            {(view.applications ?? []).length === 0 ? (
              <p className={`text-[13px] ${muted}`}>Nobody applied.</p>
            ) : (
              <ul className="space-y-1">
                {(view.applications ?? []).map((a) => (
                  <li key={a.githubLogin} className={`text-[13px] ${strong}`}>
                    <span className="font-medium">{a.githubLogin}</span>
                    <span className={muted}>
                      {' — '}
                      {a.status === 'rejected_gate' ? `not eligible${a.gateFailureReason ? ` (${a.gateFailureReason})` : ''}` : a.status}
                      {a.fit ? ` · fit ${a.fit}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {view.draw && (
            <div>
              <p className={`flex items-center gap-2 text-[13px] font-medium mb-1 ${strong}`}>
                <Trophy className="w-4 h-4" />
                {view.draw.winnerLogin ? `Drawn: ${view.draw.winnerLogin}` : 'No winner'}
                {view.draw.noWinnerReason ? ` — ${view.draw.noWinnerReason}` : ''}
              </p>
              <p className={`text-[12px] mb-2 ${muted}`}>
                Seed {view.draw.seed}, run {new Date(view.draw.ranAt).toLocaleString()}. The same seed and pool always give the same winner.
              </p>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className={muted}>
                    <th className="text-left font-semibold py-1">Applicant</th>
                    <th className="text-right font-semibold py-1">Tickets</th>
                    <th className="text-right font-semibold py-1">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {view.draw.pool.map((c) => (
                    <tr key={c.githubUserId} className={strong}>
                      <td className="py-1">{c.githubLogin}</td>
                      <td className="py-1 text-right tabular-nums">{c.tickets.toFixed(3)}</td>
                      <td className="py-1 text-right tabular-nums">{(c.share * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
