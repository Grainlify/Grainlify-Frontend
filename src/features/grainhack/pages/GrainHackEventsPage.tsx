import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { getHackathons, type Hackathon } from '../../../shared/api/client';
import { formatUsdAmount } from '../../../shared/utils/usd';

const PHASE_LABELS: Record<string, string> = {
  application_period: 'Applications open',
  issue_prep: 'Issue prep',
  live: 'Live',
  closed: 'Closed',
  results_published: 'Results published',
  settled: 'Settled',
};

interface GrainHackEventsPageProps {
  onEventClick: (id: string, name: string) => void;
}

/** The contributor-facing list of GrainHack events - replaces the dead
 * Open-Source Week placeholder. Reuses GET /hackathons, which already
 * excludes drafts, so there is nothing here for a hackathon nobody should
 * see yet. Deliberately shows no applicant or contention signal for any
 * event - see GrainHackEventDetailPage for the same rule on issues. */
export function GrainHackEventsPage({ onEventClick }: GrainHackEventsPageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);

  useEffect(() => {
    let mounted = true;
    getHackathons()
      .then((res) => {
        if (!mounted) return;
        setHackathons(res.hackathons || []);
      })
      .catch(() => {
        if (!mounted) return;
        setHackathons([]);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-0 text-center sm:text-left">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-[#b8a898]' : 'text-[#9a8b7a]'}`}>
            🏆 GrainHack
          </p>
          <h1 className={`text-[24px] sm:text-[32px] font-bold mb-2 transition-colors ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
            Live events
          </h1>
          <p className={`text-[14px] sm:text-[16px] transition-colors ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
            Sponsor-funded issues, open to any Grainlify contributor.
          </p>
        </div>
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#c9983a] to-[#a67c2e] flex items-center justify-center shadow-[0_8px_24px_rgba(162,121,44,0.3)] border border-white/15 shrink-0">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
      </div>

      {isLoading ? (
        <div className={`rounded-[24px] border p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`}>
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
      ) : hackathons.length === 0 ? (
        <div className={`rounded-[24px] border p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] text-center ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`}>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c9983a] to-[#a67c2e] flex items-center justify-center shadow-[0_8px_24px_rgba(162,121,44,0.3)] border border-white/15 mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h3 className={`text-[20px] font-bold mb-2 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>No GrainHack events yet</h3>
          <p className={isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}>Once one is announced, it will show up here.</p>
        </div>
      ) : (
        <div
          className={`rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-4 sm:p-5 transition-colors ${
            isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'
          }`}
        >
          <div className="space-y-2">
            {hackathons.map((h) => (
              <button
                key={h.id}
                onClick={() => onEventClick(h.id, h.name)}
                className={`w-full flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-[16px] border text-left transition-all ${
                  isDark ? 'bg-white/[0.06] border-white/10 hover:bg-white/[0.1]' : 'bg-white/[0.35] border-white/30 hover:bg-white/[0.5]'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 ${isDark ? 'bg-[#c9983a]/20' : 'bg-[#c9983a]/15'}`}>
                    <Trophy className="w-5 h-5 text-[#c9983a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] font-semibold sm:truncate ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>{h.name}</p>
                    <p className={`text-[12.5px] mt-0.5 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
                      {formatUsdAmount(h.contributor_prize_pool) ? `$${formatUsdAmount(h.contributor_prize_pool)} contributor pool` : 'Contributor pool TBD'}
                    </p>
                  </div>
                </div>
                <span
                  className={`self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                    isDark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#8b6f3a]'
                  }`}
                >
                  {PHASE_LABELS[h.phase] ?? h.phase}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
