import { Award } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { ProjectData, FilterType } from '../types';
import { getAvatarGradient } from '../data/leaderboardData';
import { HOVER_ONLY, LeaderboardTable, RankChip, ScorePill, useHeaderText, type LeaderboardColumn } from './LeaderboardTable';

interface ProjectsTableProps {
  data: ProjectData[];
  activeFilter: FilterType;
  isLoaded: boolean;
}

function isLogoUrl(logo: string): boolean {
  return typeof logo === 'string' && (logo.startsWith('http://') || logo.startsWith('https://'));
}

export function ProjectsTable({ data, activeFilter, isLoaded }: ProjectsTableProps) {
  const { theme } = useTheme();
  const headerText = useHeaderText();

  const columns: LeaderboardColumn<ProjectData>[] = [
    {
      key: 'rank',
      header: 'Rank',
      headerClassName: `col-span-1 ${headerText} max-sm:col-span-1`,
      cellClassName: 'col-span-1 flex items-center max-sm:col-span-1',
      render: (project) => <RankChip rank={project.rank} />,
    },
    {
      key: 'project',
      header: 'Project',
      headerClassName: `col-span-6 ${headerText} max-sm:col-span-1`,
      cellClassName: 'col-span-6 flex items-center gap-2.5 max-sm:col-span-1 max-sm:min-w-0',
      render: (project, index) => (
        <>
          <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(index)} flex items-center justify-center text-white font-bold text-[13px] shadow-md border-2 border-white/25 overflow-hidden group-hover:scale-125 group-hover:shadow-lg group-hover:rotate-12 transition-all duration-300 max-sm:shrink-0`}>
            {isLogoUrl(project.logo) ? (
              <img src={project.logo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              project.logo
            )}
            {/* Glow ring on hover */}
            <div className="absolute inset-0 rounded-full border-2 border-[#c9983a]/0 group-hover:border-[#c9983a]/50 transition-all duration-300" />
          </div>
          <div className="max-sm:min-w-0">
            <div title={project.name} className={`text-[13.5px] font-bold group-hover:text-[#c9983a] transition-colors duration-300 max-sm:truncate ${
              theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`}>
              {project.name}
            </div>
            {activeFilter === 'contributions' && project.contributors ? (
              <div className={`text-[11px] transition-colors max-sm:truncate ${
                theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
              }`}>{project.contributors} contributors</div>
            ) : null}
            {project.ecosystems && (
              <div className="flex gap-1.5 mt-0.5 max-sm:overflow-hidden">
                {project.ecosystems.map((eco, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-[#c9983a]/20 border border-[#c9983a]/30 rounded-[6px] text-[10px] font-semibold text-[#8b6f3a] hover:bg-[#c9983a]/30 transition-colors">
                    {eco}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      ),
    },
    {
      key: 'score',
      header: (
        <>
          Score
          <Award className="w-3.5 h-3.5" />
        </>
      ),
      headerClassName: `col-span-2 ${headerText} text-right flex items-center justify-end gap-1 max-sm:col-span-1`,
      cellClassName: 'col-span-2 flex items-center justify-end max-sm:col-span-1',
      render: (project) => <ScorePill>{project.score}</ScorePill>,
    },
    {
      key: 'action',
      header: null,
      headerClassName: `col-span-3 ${HOVER_ONLY}`,
      cellClassName: `col-span-3 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 gap-2 ${HOVER_ONLY}`,
      render: (project) => (
        <>
          {project.activity && (
            <div className={`px-2.5 py-1 rounded-[8px] text-[10.5px] font-semibold ${
              project.activity === 'Very High' ? 'bg-green-500/20 text-green-700 border border-green-500/30' :
              project.activity === 'High' ? 'bg-blue-500/20 text-blue-700 border border-blue-500/30' :
              project.activity === 'Medium' ? 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/30' :
              'bg-gray-500/20 text-gray-700 border border-gray-500/30'
            }`}>
              {project.activity}
            </div>
          )}
          <button className="px-3 py-1.5 rounded-[9px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white text-[11px] font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 border border-white/10">
            View Project
          </button>
        </>
      ),
    },
  ];

  return (
    <LeaderboardTable
      columns={columns}
      rows={data}
      getKey={(project) => project.rank}
      isLoaded={isLoaded}
    />
  );
}
