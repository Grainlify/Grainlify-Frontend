import { useEffect, useState, useMemo, useCallback } from 'react';
import { Eye, FileText, GitPullRequest, GitMerge } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { StatsCard } from './StatsCard';
import { StatsCardSkeleton } from './StatsCardSkeleton';
import { ActivityItem } from './ActivityItem';
import { ApplicationsChart } from './ApplicationsChart';
import { StatCard, Activity, ChartDataPoint } from '../../types';
import { getProjectIssues, getProjectPRs } from '../../../../shared/api/client';
import { ActivityItemSkeleton } from '../../../../shared/components/ActivityItemSkeleton';
import { ChartSkeleton } from '../../../../shared/components/ChartSkeleton';
import { LoadFailed } from '../../../../shared/components/LoadFailed';

interface Project {
  id: string;
  github_full_name: string;
  status: string;
}

interface DashboardTabProps {
  selectedProjects: Project[];
  /** When true, parent is still loading the project list; show loading skeleton instead of empty state */
  isLoadingProjects?: boolean;
  onRefresh?: () => void;
  onNavigateToIssue?: (issueId: string, projectId: string) => void;
}

export function DashboardTab({ selectedProjects, isLoadingProjects = false, onRefresh: _onRefresh, onNavigateToIssue }: DashboardTabProps) {
  const { theme } = useTheme();
  const [issues, setIssues] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // `repos` names the projects whose issues or PRs failed; `nothingLoaded` is
  // true when every fetch failed, so the zero counts would be pure invention.
  const [loadError, setLoadError] = useState<{ error: unknown; repos: string[]; nothingLoaded: boolean } | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Show loading when parent is loading projects OR when we're loading dashboard data
  const showLoading = isLoadingProjects || isLoading;

  // Fetch data from selected projects (only when parent has finished loading and we have projects)
  useEffect(() => {
    if (isLoadingProjects) return;
    loadData();
    // Reset expanded state when projects change
    setShowAllActivities(false);
  }, [selectedProjects, isLoadingProjects]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const failed: { error: unknown; repos: string[]; count: number } = { error: null, repos: [], count: 0 };
    const recordFailure = (project: Project, err: unknown) => {
      failed.error = err;
      failed.count += 1;
      const name = project.github_full_name || project.id;
      if (!failed.repos.includes(name)) failed.repos.push(name);
    };
    try {
      if (selectedProjects.length === 0) {
        setIssues([]);
        setPrs([]);
        setIsLoading(false);
        return;
      }

      // Fetch issues and PRs from all selected projects
      const [issuesData, prsData] = await Promise.all([
        Promise.all(selectedProjects.map(async (project) => {
          try {
            const response = await getProjectIssues(project.id);
            return (response.issues || []).map((issue: any) => ({
              ...issue,
              projectName: project.github_full_name,
              projectId: project.id,
            }));
          } catch (err) {
            // Recorded, not swallowed: this used to return [] alone, so a failed
            // fetch rendered zero counts and "No recent activity found."
            console.error(`Failed to fetch issues for ${project.github_full_name}:`, err);
            recordFailure(project, err);
            return [];
          }
        })),
        Promise.all(selectedProjects.map(async (project) => {
          try {
            const response = await getProjectPRs(project.id);
            return (response.prs || []).map((pr: any) => ({
              ...pr,
              projectName: project.github_full_name,
            }));
          } catch (err) {
            console.error(`Failed to fetch PRs for ${project.github_full_name}:`, err);
            recordFailure(project, err);
            return [];
          }
        })),
      ]);

      const allIssues = issuesData.flat();
      const allPRs = prsData.flat();

      // Sort by updated_at (most recent first)
      allIssues.sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.last_seen_at).getTime();
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.last_seen_at).getTime();
        return dateB - dateA;
      });

      allPRs.sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.last_seen_at).getTime();
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.last_seen_at).getTime();
        return dateB - dateA;
      });

      setIssues(allIssues);
      setPrs(allPRs);
      setLoadError(failed.count > 0
        ? { error: failed.error, repos: failed.repos, nothingLoaded: failed.count === selectedProjects.length * 2 }
        : null);
      setIsLoading(false);
    } catch (err) {
      // This used to leave isLoading true, i.e. a skeleton forever.
      console.error('Failed to load dashboard data:', err);
      setIssues([]);
      setPrs([]);
      setLoadError({ error: err, repos: [], nothingLoaded: true });
      setIsLoading(false);
    }
  };

  // Refresh data when page becomes visible (user switches back to tab)
  // And when repositories are refreshed (new repo added)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedProjects.length > 0) {
        loadData();
      }
    };

    const handleRepositoriesRefreshed = () => {
      // Refresh dashboard data when repositories are added/updated
      if (selectedProjects.length > 0) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('repositories-refreshed', handleRepositoriesRefreshed);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('repositories-refreshed', handleRepositoriesRefreshed);
    };
  }, [selectedProjects]);

  // Helper function to format time ago (memoized to prevent unnecessary re-renders)
  const formatTimeAgo = useCallback((date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  }, []);

  // Helper function to parse time ago for sorting (memoized)
  const parseTimeAgo = useCallback((timeAgo: string): number => {
    const now = new Date().getTime();
    if (timeAgo.includes('minute')) {
      const mins = parseInt(timeAgo) || 0;
      return now - mins * 60000;
    }
    if (timeAgo.includes('hour')) {
      const hours = parseInt(timeAgo) || 0;
      return now - hours * 3600000;
    }
    if (timeAgo.includes('day')) {
      const days = parseInt(timeAgo) || 0;
      return now - days * 86400000;
    }
    if (timeAgo.includes('month')) {
      const months = parseInt(timeAgo) || 0;
      return now - months * 30 * 86400000;
    }
    return now;
  }, []);

  // Calculate stats from real data
  const stats: StatCard[] = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentIssues = issues.filter(issue => {
      const updatedAt = issue.updated_at ? new Date(issue.updated_at) : new Date(issue.last_seen_at);
      return updatedAt >= sevenDaysAgo;
    });

    const recentPRs = prs.filter(pr => {
      const updatedAt = pr.updated_at ? new Date(pr.updated_at) : new Date(pr.last_seen_at);
      return updatedAt >= sevenDaysAgo;
    });

    const openedPRs = recentPRs.filter(pr => pr.state === 'open');
    const mergedPRs = recentPRs.filter(pr => pr.merged === true);

    return [
      {
        id: 1,
        title: 'Repository Views',
        subtitle: 'Last 7 days',
        value: 0,
        change: -100,
        icon: Eye,
      },
      {
        id: 2,
        title: 'Issue Views',
        subtitle: 'Last 7 days',
        value: recentIssues.length,
        change: 0,
        icon: FileText,
      },
      {
        id: 3,
        title: 'Issue Applications',
        subtitle: 'Last 7 days',
        value: recentIssues.reduce((sum, issue) => sum + (issue.comments_count || 0), 0),
        change: 0,
        icon: FileText,
      },
      {
        id: 4,
        title: 'Pull Requests Opened',
        subtitle: 'Last 7 days',
        value: openedPRs.length,
        change: openedPRs.length > 0 ? 100 : 0,
        icon: GitPullRequest,
      },
      {
        id: 5,
        title: 'Pull Requests Merged',
        subtitle: 'Last 7 days',
        value: mergedPRs.length,
        change: mergedPRs.length > 0 ? 100 : 0,
        icon: GitMerge,
      },
    ];
  }, [issues, prs]);

  // Generate activity from real data
  const activities: Activity[] = useMemo(() => {
    const combined: Activity[] = [];

    // Add recent PRs
    prs.slice(0, 10).forEach(pr => {
      combined.push({
        id: pr.github_pr_id,
        type: 'pr',
        number: pr.number,
        title: pr.title,
        label: pr.merged ? 'Merged' : pr.state === 'open' ? 'Open' : 'Closed',
        timeAgo: pr.updated_at
          ? formatTimeAgo(new Date(pr.updated_at))
          : formatTimeAgo(new Date(pr.last_seen_at)),
      });
    });

    // Add recent issues
    issues.slice(0, 10).forEach(issue => {
      combined.push({
        id: issue.github_issue_id,
        type: 'issue',
        number: issue.number,
        title: issue.title,
        label: issue.comments_count > 0 ? `${issue.comments_count} comment${issue.comments_count !== 1 ? 's' : ''}` : null,
        projectId: issue.projectId,
        closed: (issue.state || '').toLowerCase() !== 'open',
        timeAgo: issue.updated_at
          ? formatTimeAgo(new Date(issue.updated_at))
          : formatTimeAgo(new Date(issue.last_seen_at)),
      });
    });

    // Sort by time (most recent first)
    combined.sort((a, b) => {
      const timeA = parseTimeAgo(a.timeAgo);
      const timeB = parseTimeAgo(b.timeAgo);
      return timeB - timeA;
    });

    return combined; // Return all activities (will be sliced in render based on state)
  }, [issues, prs, formatTimeAgo, parseTimeAgo]);

  // Generate chart data from real data (last 6 months)
  const chartData: ChartDataPoint[] = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const now = new Date();

    return months.map((month, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);

      const monthIssues = issues.filter(issue => {
        const createdAt = issue.updated_at ? new Date(issue.updated_at) : new Date(issue.last_seen_at);
        return createdAt >= monthDate && createdAt < nextMonth;
      });

      const monthPRs = prs.filter(pr => {
        const createdAt = pr.updated_at ? new Date(pr.updated_at) : new Date(pr.last_seen_at);
        return createdAt >= monthDate && createdAt < nextMonth;
      });

      const mergedPRs = monthPRs.filter(pr => pr.merged);

      return {
        month,
        applications: monthIssues.reduce((sum, issue) => sum + (issue.comments_count || 0), 0),
        merged: mergedPRs.length,
      };
    });
  }, [issues, prs]);

  if (!showLoading && loadError?.nothingLoaded) {
    return <LoadFailed what="the dashboard" error={loadError.error} onRetry={loadData} />;
  }

  return (
    <>
      {loadError && loadError.repos.length > 0 && !showLoading && (
        <p role="alert" className={`text-[12px] px-1 mb-4 ${theme === 'dark' ? 'text-[#e8c571]' : 'text-[#8b6f3a]'}`}>
          Couldn't load all dashboard data from {loadError.repos.join(', ')}; the numbers below leave it out.{' '}
          <button type="button" onClick={loadData} className="underline font-semibold">Try again</button>
        </p>
      )}
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-5 mb-6">
        {showLoading ? (
          [...Array(5)].map((_, idx) => (
            <StatsCardSkeleton key={idx} />
          ))
        ) : (
          stats.map((stat, idx) => (
            <StatsCard key={stat.id} stat={stat} index={idx} />
          ))
        )}
      </div>

      {/* Main Content: Last Activity & Applications History */}
      <div className="grid grid-cols-2 gap-6">
        {/* Last Activity */}
        <div className={`rounded-[24px] border p-8 relative overflow-hidden group/activity transition-colors ${theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
          }`}>
          {/* Background Glow */}
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#c9983a]/8 to-transparent rounded-full blur-3xl pointer-events-none group-hover/activity:scale-125 transition-transform duration-1000" />

          <div className="relative">
            <h2 className={`text-[20px] font-bold mb-6 transition-colors ${theme === 'dark' ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
              }`}>Last activity</h2>

            {/* Activity List */}
            {showLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, idx) => (
                  <ActivityItemSkeleton key={idx} />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <div className={`text-center py-8 ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
                      No recent activity found.
                    </div>
                  ) : (
                    (showAllActivities ? activities : activities.slice(0, 5)).map((activity, idx) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                        index={idx}
                        onClick={() => {
                          if (activity.type === 'issue' && activity.projectId && onNavigateToIssue) {
                            onNavigateToIssue(activity.id.toString(), activity.projectId);
                          }
                        }}
                      />
                    ))
                  )}
                </div>
                {/* View More / Show Less Button */}
                {activities.length > 5 && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setShowAllActivities(!showAllActivities)}
                      className={`px-6 py-2.5 rounded-[10px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/20 border border-[#c9983a]/40 text-[13px] font-semibold text-[#c9983a] hover:from-[#c9983a]/35 hover:to-[#d4af37]/30 hover:scale-105 transition-all duration-200 ${
                        theme === 'dark' ? 'hover:border-[#c9983a]/60' : 'hover:border-[#c9983a]/50'
                      }`}
                    >
                      {showAllActivities ? 'Show less' : 'View more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Applications History */}
        <div className={`rounded-[24px] border p-8 relative overflow-hidden group/chart transition-colors ${theme === 'dark'
          ? 'bg-[#2d2820]/[0.4] border-white/10'
          : 'bg-white/[0.12] border-white/20'
          }`}>
          {showLoading ? (
            <ChartSkeleton />
          ) : (
            <ApplicationsChart data={chartData} />
          )}
        </div>
      </div>
    </>
  );
}