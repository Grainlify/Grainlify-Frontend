import { Users, FolderGit2 } from 'lucide-react';
import { LeaderboardType } from '../types';

interface LeaderboardTypeToggleProps {
  leaderboardType: LeaderboardType;
  onToggle: (type: LeaderboardType) => void;
  isLoaded: boolean;
}

export function LeaderboardTypeToggle({ leaderboardType, onToggle, isLoaded }: LeaderboardTypeToggleProps) {
  return (
    <div className={`sticky top-6 z-[200] flex justify-center transition-all duration-1000 ${
      isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
    }`}>
      <div className="bg-gradient-to-br from-white/[0.25] to-white/[0.15] rounded-[20px] border-2 border-white/30 shadow-[0_12px_48px_rgba(0,0,0,0.15)] p-2 flex gap-2 max-sm:p-1.5 max-sm:gap-1.5">
        <button
          onClick={() => onToggle('contributors')}
          className={`flex items-center gap-2 px-6 py-3 rounded-[14px] font-bold text-[15px] transition-all duration-300 max-sm:px-4 max-sm:py-2.5 max-sm:text-[14px] ${
            leaderboardType === 'contributors'
              ? 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-[0_6px_20px_rgba(201,152,58,0.4)] border-2 border-white/20'
              : 'text-[#6b5d4d] hover:bg-white/[0.15]'
          }`}
        >
          <Users className="w-5 h-5 max-sm:w-4 max-sm:h-4" />
          Contributors
        </button>
        <button
          onClick={() => onToggle('projects')}
          className={`flex items-center gap-2 px-6 py-3 rounded-[14px] font-bold text-[15px] transition-all duration-300 max-sm:px-4 max-sm:py-2.5 max-sm:text-[14px] ${
            leaderboardType === 'projects'
              ? 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-[0_6px_20px_rgba(201,152,58,0.4)] border-2 border-white/20'
              : 'text-[#6b5d4d] hover:bg-white/[0.15]'
          }`}
        >
          <FolderGit2 className="w-5 h-5 max-sm:w-4 max-sm:h-4" />
          Projects
        </button>
      </div>
    </div>
  );
}
