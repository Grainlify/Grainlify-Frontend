import { Award } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { LeaderData, FilterType } from "../types";
import { getAvatarGradient } from "../data/leaderboardData";
import { getGitHubAvatarUrl } from "../../../shared/utils/avatar";
import { HOVER_ONLY, LeaderboardTable, RankChip, ScorePill, useHeaderText, type LeaderboardColumn } from "./LeaderboardTable";

interface ContributorsTableProps {
  data: LeaderData[];
  activeFilter: FilterType;
  isLoaded: boolean;
  onUserClick?: (username: string, userId?: string) => void;
}

export function ContributorsTable({
  data,
  activeFilter,
  isLoaded,
  onUserClick,
}: ContributorsTableProps) {
  const { theme } = useTheme();
  const headerText = useHeaderText();

  const handleRowClick = (leader: LeaderData) => {
    if (onUserClick) {
      onUserClick(leader.username, leader.user_id);
    }
  };

  const columns: LeaderboardColumn<LeaderData>[] = [
    {
      key: "rank",
      header: "Rank",
      headerClassName: `col-span-1 ${headerText} max-sm:col-span-1`,
      cellClassName: "col-span-1 flex items-center max-sm:col-span-1",
      render: (leader) => <RankChip rank={leader.rank} />,
    },
    {
      key: "contributor",
      header: "Contributor",
      headerClassName: `col-span-7 ${headerText} max-sm:col-span-1`,
      cellClassName: "col-span-7 flex items-center gap-2.5 max-sm:col-span-1 max-sm:min-w-0",
      render: (leader, index) => (
        <>
          <div
            className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(index)} flex items-center justify-center text-white font-bold text-[13px] shadow-md border-2 border-white/25 group-hover:scale-125 group-hover:shadow-lg group-hover:rotate-12 transition-all duration-300 overflow-hidden max-sm:shrink-0`}
          >
            {leader.avatar &&
            (leader.avatar.startsWith("http") ||
              leader.avatar.startsWith("https")) ? (
              <img
                src={leader.avatar}
                alt={leader.username}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to GitHub avatar if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = getGitHubAvatarUrl(leader.username, 200);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {leader.username.substring(0, 2).toUpperCase()}
              </div>
            )}
            {/* Glow ring on hover */}
            <div className="absolute inset-0 rounded-full border-2 border-[#c9983a]/0 group-hover:border-[#c9983a]/50 transition-all duration-300" />
          </div>
          {/* On phones the name gets one line and an ellipsis, so every row is the same height. */}
          <div className="max-sm:min-w-0">
            <div
              title={leader.username}
              className={`text-[13.5px] font-bold group-hover:text-[#c9983a] transition-colors duration-300 max-sm:truncate ${
                theme === "dark" ? "text-[#f5f5f5]" : "text-[#2d2820]"
              }`}
            >
              {leader.username}
            </div>
            {activeFilter === "contributions" && leader.merged_prs ? (
              <div
                className={`text-[11px] transition-colors max-sm:truncate ${
                  theme === "dark" ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
                }`}
              >
                {leader.merged_prs} merged PRs
              </div>
            ) : null}
            {activeFilter === "ecosystems" && leader.ecosystems ? (
              <div className="flex gap-1.5 mt-0.5 max-sm:overflow-hidden">
                {leader.ecosystems.map((eco, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-[#c9983a]/20 border border-[#c9983a]/30 rounded-[6px] text-[10px] font-semibold text-[#8b6f3a] hover:bg-[#c9983a]/30 transition-colors"
                  >
                    {eco}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ),
    },
    {
      key: "score",
      header: (
        <>
          Score
          <Award className="w-3.5 h-3.5" />
        </>
      ),
      headerClassName: `col-span-2 ${headerText} text-right flex items-center justify-end gap-1 max-sm:col-span-1`,
      cellClassName: "col-span-2 flex items-center justify-end max-sm:col-span-1",
      render: (leader) => <ScorePill>{leader.score}</ScorePill>,
    },
    {
      key: "action",
      header: null,
      headerClassName: `col-span-2 ${HOVER_ONLY}`,
      cellClassName: `col-span-2 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 ${HOVER_ONLY}`,
      render: (leader) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(leader);
          }}
          className="px-3 py-1.5 rounded-[9px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white text-[11px] font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 border border-white/10"
        >
          View Profile
        </button>
      ),
    },
  ];

  return (
    <LeaderboardTable
      columns={columns}
      rows={data}
      getKey={(leader) => leader.rank}
      isLoaded={isLoaded}
      onRowClick={handleRowClick}
    />
  );
}
