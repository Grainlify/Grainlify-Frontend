import { useEffect, useState } from 'react';
import { RankBadgeCard, RANK_CARD_SIZE } from '../components/RankBadgeCard';
import { ArrowLeft, FolderGit2, Star, Users, GitPullRequest, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  getOrgSummary,
  getOrgCalendar,
  getOrgLinks,
  getOrgRatings,
  getMyOrgRatingStatus,
  getMyProjects,
  getPublicProjects,
  type OrgSummary,
  type OrgCalendarDay,
  type OrgLinks,
  type OrgRating,
  type OrgRatingStatus,
} from '../../../shared/api/client';
import { isApiError } from '../../../shared/api/apiError';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { LoadFailed } from '../../../shared/components/LoadFailed';
import { getGitHubAvatarUrl } from '../../../shared/utils/avatar';
import { Spotlight } from '../../../shared/components/ui/Spotlight';
import { getOnBrandGradient } from '../../../shared/utils/motionVariants';
import { ProjectCard, type Project } from '../components/ProjectCard';
import { RatingModal } from '../components/RatingModal';
import { OrgContributionCalendar } from '../components/OrgContributionCalendar';
import { OrgSocialLinks } from '../components/OrgSocialLinks';
import { OrgLinksModal } from '../components/OrgLinksModal';

interface OrgProfilePageProps {
  viewingOrgLogin: string;
  onBack?: () => void;
  onProjectClick?: (id: string) => void;
}

const RATINGS_PAGE_SIZE = 10;

function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';
  return formatDistanceToNow(date, { addSuffix: true });
}


function StarRow({ value, size = 'w-4 h-4' }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(value) ? 'text-[#c9983a] fill-[#c9983a]' : 'text-black/15 dark:text-white/20'}`}
        />
      ))}
    </div>
  );
}

function AvatarWithFallback({ src, name, className }: { src: string; name: string; className: string }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className={`${className} bg-gradient-to-br ${getOnBrandGradient(name)} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold">{name.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      className={`${className} flex-shrink-0`}
      onError={() => setErrored(true)}
    />
  );
}

// Mirrors BrowsePage.tsx's own local (unshared) helpers - this codebase's
// established convention is to duplicate these small per-file rather than
// factor them into a shared util (DiscoverPage.tsx does the same).
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getProjectIcon(githubFullName: string): string {
  const [owner] = githubFullName.split('/');
  return getGitHubAvatarUrl(owner, 200);
}

const PROJECT_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-emerald-500',
  'from-red-500 to-pink-500',
  'from-orange-500 to-red-500',
  'from-gray-600 to-gray-800',
  'from-green-600 to-green-800',
  'from-cyan-500 to-blue-600',
];

function getProjectColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

function truncateDescription(description: string | undefined | null, maxLength = 80): string {
  if (!description || description.trim() === '') return '';
  const firstLine = description.split('\n')[0].trim();
  if (firstLine.length > maxLength) return firstLine.substring(0, maxLength).trim() + '...';
  return firstLine;
}

export function OrgProfilePage({ viewingOrgLogin, onBack, onProjectClick }: OrgProfilePageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isAuthenticated } = useAuth();

  const [summary, setSummary] = useState<OrgSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<unknown>(null);
  const [summaryAttempt, setSummaryAttempt] = useState(0);

  const [repos, setRepos] = useState<Project[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [reposError, setReposError] = useState<unknown>(null);
  const [reposAttempt, setReposAttempt] = useState(0);

  const [calendar, setCalendar] = useState<OrgCalendarDay[]>([]);
  const [calendarTotal, setCalendarTotal] = useState(0);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [calendarError, setCalendarError] = useState<unknown>(null);
  const [calendarAttempt, setCalendarAttempt] = useState(0);

  const [links, setLinks] = useState<OrgLinks | null>(null);
  const [linksError, setLinksError] = useState(false);
  const [linksAttempt, setLinksAttempt] = useState(0);
  const [isMaintainer, setIsMaintainer] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);

  const [ratings, setRatings] = useState<OrgRating[]>([]);
  const [ratingsTotal, setRatingsTotal] = useState(0);
  const [isLoadingRatings, setIsLoadingRatings] = useState(true);
  const [ratingsError, setRatingsError] = useState<unknown>(null);

  const [myStatus, setMyStatus] = useState<OrgRatingStatus>({ eligible: false, rating: null });
  const [isLoadingMyStatus, setIsLoadingMyStatus] = useState(isAuthenticated);
  const [myStatusError, setMyStatusError] = useState(false);
  const [myStatusAttempt, setMyStatusAttempt] = useState(0);

  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSummary(true);
    setSummaryError(null);
    getOrgSummary(viewingOrgLogin)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch((err) => { if (!cancelled) setSummaryError(err); })
      .finally(() => { if (!cancelled) setIsLoadingSummary(false); });
    return () => { cancelled = true; };
  }, [viewingOrgLogin, summaryAttempt]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCalendar(true);
    setCalendarError(null);
    getOrgCalendar(viewingOrgLogin)
      .then((data) => {
        if (cancelled) return;
        setCalendar(data.calendar);
        setCalendarTotal(data.total);
      })
      // Used to leave the calendar empty, which rendered "0 contributions".
      .catch((err) => { if (!cancelled) setCalendarError(err); })
      .finally(() => { if (!cancelled) setIsLoadingCalendar(false); });
    return () => { cancelled = true; };
  }, [viewingOrgLogin, calendarAttempt]);

  useEffect(() => {
    let cancelled = false;
    setLinksError(false);
    getOrgLinks(viewingOrgLogin)
      .then((data) => { if (!cancelled) setLinks(data); })
      // links stays null so every icon but GitHub shows inactive - which
      // reads as "this org has no links". A small note says it's a failure.
      .catch(() => { if (!cancelled) setLinksError(true); });
    return () => { cancelled = true; };
  }, [viewingOrgLogin, linksAttempt]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsMaintainer(false);
      return;
    }
    let cancelled = false;
    getMyProjects()
      .then((projects) => {
        if (cancelled) return;
        const owns = projects.some(
          (p) => (p.github_full_name.split('/')[0] || '').toLowerCase() === viewingOrgLogin.toLowerCase(),
        );
        setIsMaintainer(owns);
      })
      .catch(() => { /* not a maintainer if this fails - no edit affordance, not an error state */ });
    return () => { cancelled = true; };
  }, [viewingOrgLogin, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingRepos(true);
    setReposError(null);
    // limit: 200 (the API's max) rather than relying on its default of 50 -
    // this fetch has to find every repo under one specific org out of every
    // public repo on the platform, so a low default page size risks silently
    // missing this org's own repos once the platform has more than ~50 total.
    getPublicProjects({ limit: 200 })
      .then((data) => {
        if (cancelled) return;
        const orgRepos: Project[] = data.projects
          .filter((p) => (p.github_full_name.split('/')[0] || '').toLowerCase() === viewingOrgLogin.toLowerCase())
          .map((p) => {
            const repoName = p.github_full_name.split('/')[1] ?? p.github_full_name;
            return {
              id: p.id,
              name: repoName,
              icon: getProjectIcon(p.github_full_name),
              stars: formatNumber(p.stars_count || 0),
              forks: formatNumber(p.forks_count || 0),
              contributors: p.contributors_count || 0,
              openIssues: p.open_issues_count || 0,
              prs: p.open_prs_count || 0,
              description: truncateDescription(p.description) || `${p.language || 'Project'} repository`,
              tags: Array.isArray(p.tags) ? p.tags.slice(0, 3) : [],
              color: getProjectColor(repoName),
            };
          });
        setRepos(orgRepos);
      })
      // Used to leave repos empty: "No public repositories found for this org."
      .catch((err) => { if (!cancelled) setReposError(err); })
      .finally(() => { if (!cancelled) setIsLoadingRepos(false); });
    return () => { cancelled = true; };
  }, [viewingOrgLogin, reposAttempt]);

  const fetchRatings = (offset: number) => {
    setIsLoadingRatings(true);
    setRatingsError(null);
    getOrgRatings(viewingOrgLogin, { limit: RATINGS_PAGE_SIZE, offset })
      .then((data) => {
        setRatings((prev) => (offset === 0 ? data.ratings : [...prev, ...data.ratings]));
        setRatingsTotal(data.total);
      })
      // Existing list stays as-is; the failure is shown below it. On a first
      // page this used to render "No reviews yet. Be the first…".
      .catch((err) => setRatingsError(err))
      .finally(() => setIsLoadingRatings(false));
  };

  useEffect(() => {
    setRatings([]);
    fetchRatings(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingOrgLogin]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMyStatus({ eligible: false, rating: null });
      setIsLoadingMyStatus(false);
      return;
    }
    let cancelled = false;
    setIsLoadingMyStatus(true);
    setMyStatusError(false);
    getMyOrgRatingStatus(viewingOrgLogin)
      .then((data) => { if (!cancelled) setMyStatus(data); })
      // Used to fall through to "Get a pull request merged into X to leave a
      // review here." - telling an eligible reviewer they weren't.
      .catch(() => {
        if (cancelled) return;
        setMyStatus({ eligible: false, rating: null });
        setMyStatusError(true);
      })
      .finally(() => { if (!cancelled) setIsLoadingMyStatus(false); });
    return () => { cancelled = true; };
  }, [viewingOrgLogin, isAuthenticated, myStatusAttempt]);

  const handleRatingSubmitted = () => {
    setRatings([]);
    fetchRatings(0);
    getMyOrgRatingStatus(viewingOrgLogin).then(setMyStatus).catch(() => {});
    getOrgSummary(viewingOrgLogin).then(setSummary).catch(() => {});
  };

  const cardClass = `rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 md:p-8 ${
    isDark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'
  }`;
  const mutedText = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const headingText = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';

  if (summaryError && !isLoadingSummary) {
    // Only the backend's own 404 means the org doesn't exist; any other
    // failure used to show the same "Couldn't find" message.
    const notFound = isApiError(summaryError) && summaryError.status === 404 && summaryError.data?.error === 'org_not_found';
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        {notFound ? (
          <p className={`text-[15px] ${mutedText}`}>Couldn't find an organization called "{viewingOrgLogin}".</p>
        ) : (
          <LoadFailed what={`the organization "${viewingOrgLogin}"`} error={summaryError} onRetry={() => setSummaryAttempt((n) => n + 1)} />
        )}
        {onBack && (
          <button onClick={onBack} className="mt-4 text-[13px] text-[#c9983a] hover:text-[#a67c2e] font-medium">
            ← Back
          </button>
        )}
      </div>
    );
  }

  const statTiles = [
    { icon: FolderGit2, label: 'Repositories', value: summary?.repo_count },
    { icon: Star, label: 'Stars', value: summary?.stars_count },
    { icon: Users, label: 'Contributors', value: summary?.contributors_count },
    { icon: GitPullRequest, label: 'Merged PRs', value: summary?.merged_prs_count },
  ];

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className={`flex items-center gap-2 text-[13px] font-medium transition-colors ${isDark ? 'text-[#d4c5b0] hover:text-white' : 'text-[#6b5d4d] hover:text-[#2d2820]'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {/* Header + stats stacked on the left (the "first row" and "second
          row"), with one big rank badge on the right spanning the full
          combined height of both - the rank badge markup mirrors
          ProfilePage.tsx's own full-size rank badge (same multi-layer
          glow/shine, ~56px rank number, decorative dots), not a compact
          tile, since this should read as the same "epic" badge a user gets
          on their own profile. */}
      {/* The badge's height is a FLOOR for the left column, not a cap.
          #1004 pinned the column to exactly RANK_CARD_SIZE and made the two
          rows share it, which squeezed the stat tiles to 109px against 153px
          of content - and their overflow-hidden, which exists for the
          decorative blur orb, clipped the number rather than spilling
          visibly. A layout that silently truncates data is worse than one
          that is 44px out of alignment.

          So the column is min-h: it still matches the badge when the content
          is short, and grows instead of clipping when it is not. The tiles
          size to their content, which is what every other stat display in the
          app does. The badge centres against the column rather than
          stretching - it is a fixed square by design.

          lg only: stacked on narrow screens there is nothing to align to. */}
      <div
        className="flex flex-col lg:flex-row gap-4 lg:items-stretch"
        style={{ ['--rank-card-size' as string]: `${RANK_CARD_SIZE}px` }}
      >
        <div className="flex flex-col gap-4 flex-1 min-w-0 lg:min-h-[var(--rank-card-size)]">
          {/* Header (first row), with an ambient Spotlight glow behind it */}
          <div className={`relative overflow-hidden ${cardClass}`}>
            <Spotlight />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-5 flex-1 min-w-0">
                {isLoadingSummary ? (
                  <SkeletonLoader variant="circle" width="88px" height="88px" />
                ) : (
                  <AvatarWithFallback
                    src={summary?.avatar_url || getGitHubAvatarUrl(viewingOrgLogin, 200)}
                    name={viewingOrgLogin}
                    className="w-[88px] h-[88px] rounded-[20px] border border-white/20 text-3xl shadow-[0_8px_24px_rgba(201,152,58,0.2)]"
                  />
                )}
                <div className="min-w-0">
                  {isLoadingSummary ? (
                    <SkeletonLoader variant="text" width="220px" height="34px" />
                  ) : (
                    <h1 className={`text-[30px] font-black tracking-tight truncate ${headingText}`}>{viewingOrgLogin}</h1>
                  )}
                  {!isLoadingSummary && summary && (
                    <div className={`flex items-center gap-1.5 mt-1.5 text-[14px] ${mutedText}`}>
                      <FolderGit2 className="w-4 h-4" />
                      {summary.repo_count} {summary.repo_count === 1 ? 'repository' : 'repositories'} on Grainlify
                    </div>
                  )}
                  {!isLoadingSummary && (
                    <div className="flex items-center gap-3 flex-wrap mt-4">
                      <OrgSocialLinks orgLogin={viewingOrgLogin} links={links} />
                      {linksError && (
                        <p role="alert" className={`text-[12px] ${mutedText}`}>
                          Couldn't load this org's links.{' '}
                          <button type="button" onClick={() => setLinksAttempt((n) => n + 1)} className="underline font-semibold">Try again</button>
                        </p>
                      )}
                      {isMaintainer && (
                        <button
                          type="button"
                          onClick={() => setIsLinksModalOpen(true)}
                          className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                            isDark
                              ? 'bg-white/[0.06] border-white/15 text-[#d4c5b0] hover:bg-white/[0.1]'
                              : 'bg-white/[0.2] border-white/30 text-[#7a6b5a] hover:bg-white/[0.3]'
                          }`}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit links
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats (second row) - one row, not split into sub-rows */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statTiles.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className={`group relative overflow-hidden rounded-[20px] border p-5 transition-all duration-300 hover:-translate-y-0.5 ${
                  isDark
                    ? 'bg-white/[0.08] border-white/15 hover:border-[#c9983a]/40 hover:shadow-[0_12px_32px_rgba(201,152,58,0.15)]'
                    : 'bg-white/[0.18] border-white/30 hover:border-[#c9983a]/40 hover:shadow-[0_12px_32px_rgba(201,152,58,0.12)]'
                }`}
              >
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#c9983a]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/15 border border-[#c9983a]/30 mb-3">
                  <Icon className="w-4.5 h-4.5 text-[#c9983a]" />
                </div>
                <div className={`relative text-[12px] mb-1 ${mutedText}`}>{label}</div>
                {isLoadingSummary ? (
                  <SkeletonLoader variant="text" width="50px" height="28px" />
                ) : (
                  <div className={`relative text-[26px] font-black ${headingText}`}>{value ?? 0}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* The SAME badge the contributor profile renders, not a port of it.
            This was a verbatim copy of ProfilePage's markup, and it drifted
            exactly as copies do: stretched by the flex row to whatever the
            column beside it happened to be, so it rendered as a tall
            rectangle instead of the square badge people see on their own
            profile. RankBadgeCard is a fixed RANK_CARD_SIZE square and owns
            its own loading and unranked states. */}
        <div className="flex-shrink-0 lg:self-center">
          <RankBadgeCard
            isLoading={isLoadingSummary}
            position={summary?.rank_position}
            tierName={summary?.rank_tier_name}
          />
        </div>
      </div>

      {/* Aggregate rating + review CTA - full width now that rank moved
          into the stats row above. */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            {summary?.average_rating ? (
              <>
                <div className={`text-[40px] font-black leading-none ${headingText}`}>
                  {summary.average_rating.toFixed(1)}
                </div>
                <div>
                  <StarRow value={summary.average_rating} size="w-4 h-4" />
                  <div className={`text-[12px] mt-1.5 ${mutedText}`}>
                    {summary.ratings_count} {summary.ratings_count === 1 ? 'review' : 'reviews'}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <StarRow value={0} size="w-5 h-5" />
                <div>
                  <div className={`text-[14px] font-bold ${headingText}`}>No ratings yet</div>
                  <div className={`text-[12px] ${mutedText}`}>Be the first to leave a review</div>
                </div>
              </div>
            )}
          </div>
          <div>
            {isLoadingMyStatus ? (
              <SkeletonLoader variant="default" width="170px" height="52px" className="rounded-[16px]" />
            ) : myStatusError ? (
              <p role="alert" className={`text-[12px] max-w-[280px] text-right ${mutedText}`}>
                Couldn't check whether you can review {viewingOrgLogin}.{' '}
                <button type="button" onClick={() => setMyStatusAttempt((n) => n + 1)} className="underline font-semibold">Try again</button>
              </p>
            ) : myStatus.rating ? (
              <div className="text-right">
                <p className={`text-[12px] mb-2.5 ${mutedText}`}>You rated this org {myStatus.rating.rating} / 5</p>
                <button
                  onClick={() => setIsRatingModalOpen(true)}
                  className="px-4 py-2 rounded-[10px] text-[13px] font-medium border border-[#c9983a]/50 text-[#c9983a] hover:bg-[#c9983a]/10 transition-all"
                >
                  Edit your review
                </button>
              </div>
            ) : myStatus.eligible ? (
              <button
                onClick={() => setIsRatingModalOpen(true)}
                className="px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all hover:scale-[1.02]"
              >
                Write a review
              </button>
            ) : (
              <p className={`text-[12px] max-w-[280px] text-right ${mutedText}`}>
                Get a pull request merged into {viewingOrgLogin} to leave a review here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contribution heatmap - same section ProfilePage.tsx shows on a
          user's own profile, ported to aggregate across the org's repos. */}
      {calendarError != null && !isLoadingCalendar ? (
        <div className={cardClass}>
          <LoadFailed what="contribution activity" error={calendarError} onRetry={() => setCalendarAttempt((n) => n + 1)} />
        </div>
      ) : (
        <OrgContributionCalendar calendar={calendar} total={calendarTotal} isLoading={isLoadingCalendar} />
      )}

      {/* Activity chart (weekly issues/merged-PRs bar chart) removed for now
          per explicit request - fetch effect/state above and
          OrgActivityChart.tsx itself are left in place so this is a
          one-block re-add, not a rebuild, if it comes back later. */}

      {/* Repositories - shown inline so a repo is one click away, not a
          separate "view all" page. */}
      <div className={cardClass}>
        <h2 className={`text-[18px] font-bold mb-5 ${headingText}`}>Repositories</h2>
        {isLoadingRepos ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonLoader key={i} variant="default" width="100%" height="220px" className="rounded-[16px]" />
            ))}
          </div>
        ) : reposError != null ? (
          <LoadFailed what="this org's repositories" error={reposError} onRetry={() => setReposAttempt((n) => n + 1)} />
        ) : repos.length === 0 ? (
          <p className={`text-[13px] ${mutedText}`}>No public repositories found for this org.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {repos.map((repo) => (
              <ProjectCard key={repo.id} project={repo} onClick={onProjectClick} />
            ))}
          </div>
        )}
      </div>

      {/* Reviews list */}
      <div className={cardClass}>
        <h2 className={`text-[18px] font-bold mb-5 ${headingText}`}>Reviews</h2>
        {isLoadingRatings && ratings.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonLoader key={i} variant="default" width="100%" height="96px" className="rounded-[16px]" />
            ))}
          </div>
        ) : ratingsError != null && ratings.length === 0 ? (
          <LoadFailed what="the reviews" error={ratingsError} onRetry={() => fetchRatings(0)} />
        ) : ratings.length === 0 ? (
          <p className={`text-[13px] ${mutedText}`}>No reviews yet. Be the first to rate this org once your PR is merged.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ratings.map((r) => (
              <div
                key={`${r.user_id}-${r.created_at}`}
                className={`rounded-[16px] border p-4 transition-colors ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.3] border-white/40'}`}
              >
                <div className="flex items-start gap-3">
                  <AvatarWithFallback
                    src={r.avatar_url || (r.github_login ? getGitHubAvatarUrl(r.github_login, 80) : '')}
                    name={r.display_name}
                    className="w-9 h-9 rounded-full border border-white/20 text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => { window.location.href = `/dashboard?tab=profile&user=${r.github_login || r.user_id}`; }}
                        className={`text-[13px] font-semibold hover:text-[#c9983a] transition-colors ${headingText}`}
                      >
                        {r.display_name}
                      </button>
                      <StarRow value={r.rating} size="w-3 h-3" />
                      <span className={`text-[11px] ${mutedText}`}>{formatTimeAgo(r.updated_at || r.created_at)}</span>
                    </div>
                    {r.comment && (
                      <p className={`text-[13px] mt-1.5 ${isDark ? 'text-[#d4c5b0]' : 'text-[#4a4038]'}`}>{r.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {ratingsError != null && ratings.length > 0 && !isLoadingRatings && (
          <p role="alert" className={`text-[12px] text-center mt-5 ${mutedText}`}>
            Couldn't load more reviews.{' '}
            <button type="button" onClick={() => fetchRatings(ratings.length)} className="underline font-semibold">Try again</button>
          </p>
        )}
        {ratings.length < ratingsTotal && !ratingsError && (
          <div className="text-center mt-5">
            <button
              onClick={() => fetchRatings(ratings.length)}
              disabled={isLoadingRatings}
              className="text-[13px] text-[#c9983a] hover:text-[#a67c2e] font-medium disabled:opacity-50"
            >
              {isLoadingRatings ? 'Loading…' : 'Load more reviews'}
            </button>
          </div>
        )}
      </div>

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        orgLogin={viewingOrgLogin}
        initialRating={myStatus.rating?.rating}
        initialComment={myStatus.rating?.comment}
        onSubmitted={handleRatingSubmitted}
      />

      <OrgLinksModal
        isOpen={isLinksModalOpen}
        onClose={() => setIsLinksModalOpen(false)}
        orgLogin={viewingOrgLogin}
        currentLinks={links}
        onSubmitted={setLinks}
      />
    </div>
  );
}
