import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Wrench } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { ApplicationWindow } from '../components/ApplicationWindow';
import { formatUsdAmount } from '../../../shared/utils/usd';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import {
  getHackathon,
  getHackathonIssues,
  type Hackathon,
  type PublicHackathonIssue,
} from '../../../shared/api/client';

const PHASE_LABELS: Record<string, string> = {
  application_period: 'Applications open',
  issue_prep: 'Issue prep',
  live: 'Live',
  closed: 'Closed',
  results_published: 'Results published',
  settled: 'Settled',
};

/** Copy for a hackathon with no published issues, keyed off phase rather
 * than treated as one generic "nothing here" state - an event still taking
 * project applications, one whose issues are being prepared, and one whose
 * window has lapsed are three different facts, and none of them is an
 * error. */
function emptyStateCopy(phase: string): { title: string; body: string } {
  if (phase === 'application_period') {
    return {
      title: 'Issues have not been added yet',
      body: "This event is still reviewing which projects will take part. Issues appear here once a project is accepted and moves into issue prep.",
    };
  }
  if (phase === 'issue_prep') {
    return {
      title: 'Issues are being added',
      body: "Maintainers are preparing this event's issues. Nothing to apply to yet — check back soon, or watch this page.",
    };
  }
  return {
    title: 'No issues were published',
    body: 'This event has no published issues to apply to.',
  };
}

/** "2 issues open", "2 issues assigned", or "1 open · 1 assigned" for a mix.
 *  An assigned issue is never counted as open: its draw has run. */
export function issueCountLabel(issues: Pick<PublicHackathonIssue, 'assigned'>[]): string {
  const assigned = issues.filter((i) => i.assigned === true).length;
  const open = issues.length - assigned;
  const plural = (n: number) => `${n} issue${n === 1 ? '' : 's'}`;
  if (assigned === 0) return `${plural(open)} open`;
  if (open === 0) return `${plural(assigned)} assigned`;
  return `${open} open · ${assigned} assigned`;
}

interface GrainHackEventDetailPageProps {
  eventId: string;
  eventName: string;
  onBack: () => void;
  onIssueClick: (issueId: string, projectId: string, repoFullName: string) => void;
}

export function GrainHackEventDetailPage({ eventId, eventName, onBack, onIssueClick }: GrainHackEventDetailPageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [issues, setIssues] = useState<PublicHackathonIssue[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setLoadError(null);
    Promise.all([getHackathon(eventId), getHackathonIssues(eventId)])
      .then(([h, i]) => {
        if (!mounted) return;
        setHackathon(h);
        setIssues(i.issues || []);
      })
      .catch((error) => {
        if (!mounted) return;
        // Recorded rather than rendered as the empty state: this used to
        // fall through to "No issues were published" on a live event.
        setHackathon(null);
        setIssues([]);
        setLoadError(error);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [eventId, attempt]);

  const phase = hackathon?.phase ?? '';
  const title = hackathon?.name ?? eventName;
  const empty = useMemo(() => emptyStateCopy(phase), [phase]);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className={`flex items-center gap-2 px-4 py-2 rounded-[12px] border transition-all ${
          isDark ? 'bg-white/[0.08] border-white/10 text-[#f5f5f5] hover:bg-white/[0.12]' : 'bg-white/[0.15] border-white/25 text-[#2d2820] hover:bg-white/[0.2]'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[13px] font-medium">All events</span>
      </button>

      {isLoading ? (
        <div className={`rounded-[24px] border p-8 transition-colors animate-pulse ${isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'}`}>
          <div className={`h-7 w-72 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <div className={`h-4 w-40 rounded mt-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
        </div>
      ) : loadError ? (
        <LoadFailed what="this event" error={loadError} onRetry={() => setAttempt((n) => n + 1)} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-0">
            <div>
              <h1 className={`text-[22px] sm:text-[26px] font-bold mb-2 transition-colors ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>{title}</h1>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                  isDark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#8b6f3a]'
                }`}
              >
                {PHASE_LABELS[phase] ?? phase}
              </span>
            </div>
            {formatUsdAmount(hackathon?.contributor_prize_pool) && (
              <div className="text-left sm:text-right">
                <div className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-[#b8a898]' : 'text-[#9a8b7a]'}`}>
                  Contributor pool
                </div>
                <div className={`text-[20px] font-extrabold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                  ${formatUsdAmount(hackathon?.contributor_prize_pool)}
                </div>
              </div>
            )}
          </div>

          {issues.length === 0 ? (
            <div
              className={`rounded-[24px] border p-9 sm:p-9 shadow-[0_8px_32px_rgba(0,0,0,0.08)] text-center ${
                isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'
              }`}
            >
              <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] flex items-center justify-center shadow-[0_8px_24px_rgba(162,121,44,0.3)] border border-white/15 mx-auto mb-4">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-[16px] font-bold mb-1.5 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>{empty.title}</h3>
              <p className={`text-[13.5px] max-w-[380px] mx-auto ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>{empty.body}</p>
            </div>
          ) : (
            <div
              className={`rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-4 sm:p-5 transition-colors ${
                isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/25'
              }`}
            >
              <p className={`text-[11px] font-bold uppercase tracking-wide mb-3 ${isDark ? 'text-[#b8a898]' : 'text-[#9a8b7a]'}`}>
                {issueCountLabel(issues)}
              </p>
              <div className="space-y-2">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[16px] border transition-all ${
                      isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[14.5px] font-semibold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                          {issue.issue_title || `Issue #${issue.issue_number}`}
                        </span>
                        {issue.difficulty_tier && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isDark ? 'bg-white/10 text-[#d4d4d4]' : 'bg-black/[0.06] text-[#4a3f2f]'
                            }`}
                          >
                            {issue.difficulty_tier}
                          </span>
                        )}
                      </div>
                      <p className={`text-[12.5px] mb-2 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
                        {issue.repo_full_name} #{issue.issue_number}
                      </p>
                      <ApplicationWindow
                        opensAt={issue.application_window_opens_at}
                        closesAt={issue.application_window_closes_at}
                        reserved={issue.reserved}
                        assigned={issue.assigned === true}
                        compact
                      />
                    </div>
                    <button
                      onClick={() => onIssueClick(String(issue.issue_number), issue.project_id, issue.repo_full_name)}
                      className="w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.4)] transition-all border border-white/10"
                    >
                      View issue
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
