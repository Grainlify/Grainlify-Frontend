import { useCallback } from 'react';
import { Users, FolderGit2 } from 'lucide-react';
import { LeaderboardType } from '../types';

interface LeaderboardTypeToggleProps {
  leaderboardType: LeaderboardType;
  onToggle: (type: LeaderboardType) => void;
  isLoaded: boolean;
}

const TYPES: { key: LeaderboardType; icon: typeof Users; label: string }[] = [
  { key: 'contributors', icon: Users, label: 'Contributors' },
  { key: 'projects', icon: FolderGit2, label: 'Projects' },
];

export function LeaderboardTypeToggle({ leaderboardType, onToggle, isLoaded }: LeaderboardTypeToggleProps) {
  const onKeyDown = useCallback((e: React.KeyboardEvent, current: LeaderboardType) => {
    let next: LeaderboardType | null = null;
    if (e.key === 'ArrowLeft') {
      next = current === 'contributors' ? 'projects' : 'contributors';
    } else if (e.key === 'ArrowRight') {
      next = current === 'projects' ? 'contributors' : 'projects';
    }
    if (next) {
      e.preventDefault();
      onToggle(next);
    }
  }, [onToggle]);

  return (
    <div className={`sticky top-6 z-[200] flex justify-center transition-all duration-1000 ${
      isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
    }`}>
      <div
        role="tablist"
        aria-label="Leaderboard type"
        className="backdrop-blur-[40px] bg-gradient-to-br from-white/[0.25] to-white/[0.15] rounded-[20px] border-2 border-white/30 shadow-[0_12px_48px_rgba(0,0,0,0.15)] p-2 flex gap-2"
      >
        {TYPES.map(({ key, icon: Icon, label }) => {
          const isActive = leaderboardType === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`leaderboard-panel-${key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onToggle(key)}
              onKeyDown={(e) => onKeyDown(e, key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-[14px] font-bold text-[15px] transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-[0_6px_20px_rgba(201,152,58,0.4)] scale-105 border-2 border-white/20'
                  : 'text-[#6b5d4d] hover:bg-white/[0.15] hover:scale-105'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
