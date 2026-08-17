import { Star, GitFork } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { getOnBrandGradient } from '../../../shared/utils/motionVariants';
import { SpotlightCard } from '../../../shared/components/ui/aceternity/SpotlightCard';

export interface Project {
  id: number | string;
  name: string;
  icon: string;
  stars: string;
  forks: string;
  contributors: number;
  openIssues: number;
  prs: number;
  description: string;
  tags: string[];
  color: string;
}

interface ProjectCardProps {
  project: Project;
  onClick?: (id: string) => void;
  variants?: Variants;
}

// Inner-content-card tier: rounded-[16px] + + resting/hover shadow.
export function ProjectCard({ project, onClick, variants }: ProjectCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [avatarError, setAvatarError] = useState(false);

  // Check if icon is a URL (GitHub avatar) or emoji/text
  const isAvatarUrl = project.icon.startsWith('http');
  const showAvatarImage = isAvatarUrl && !avatarError;

  // Hover-only, outside any glass: the highlight follows the cursor via CSS
  // custom properties rather than React state, so moving the mouse over a grid
  // of these re-renders nothing. See SpotlightCard.
  // At most two chips are drawn; the rest collapse into "+N". Two keeps the
  // row on one line at the narrowest column this grid produces.
  const MAX_VISIBLE_TAGS = 2;
  const visibleTags = project.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTags = project.tags.slice(MAX_VISIBLE_TAGS);
  const hiddenTagCount = hiddenTags.length;

  return (
    <SpotlightCard className="rounded-[16px] h-full">
    <motion.div
      variants={variants}
      data-testid="project-card"
      className={`flex flex-col h-[var(--repo-card-height)] rounded-[16px] border p-5 transition-all cursor-pointer motion-safe:hover:-translate-y-1 active:scale-[0.98] ${
        isDark
          ? 'bg-white/[0.08] border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.24)] hover:bg-white/[0.12] hover:shadow-[0_8px_24px_rgba(201,152,58,0.15)]'
          : 'bg-white/[0.15] border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white/[0.2] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
      }`}
      onClick={() => onClick?.(project.id.toString())}
    >
      <div className="flex items-start justify-between mb-4">
        {showAvatarImage ? (
          <img
            src={project.icon}
            alt={project.name}
            loading="lazy"
            decoding="async"
            className="w-11 h-11 rounded-[12px] border border-white/20 flex-shrink-0"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div
            className={`w-11 h-11 rounded-[12px] bg-gradient-to-br ${getOnBrandGradient(project.name)} flex items-center justify-center shadow-md flex-shrink-0`}
          >
            <span className="text-white font-bold text-lg">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <h4 className={`text-[16px] font-bold mb-2 transition-colors ${
        isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
      }`}>{project.name}</h4>
      <p className={`text-[12px] mb-4 line-clamp-2 transition-colors ${
        isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
      }`}>{project.description}</p>

      <div className={`flex items-center space-x-3 text-[12px] mb-4 transition-colors ${
        isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
      }`}>
        <div className="flex items-center space-x-1">
          <Star className="w-3 h-3 text-[#c9983a]" />
          <span>{project.stars}</span>
        </div>
        <div className="flex items-center space-x-1">
          <GitFork className="w-3 h-3 text-[#c9983a]" />
          <span>{project.forks}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-white/10">
        <div className="text-center">
          <div className={`text-[18px] font-bold transition-colors ${
            isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}>{project.contributors}</div>
          <div className={`text-[10px] transition-colors ${
            isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
          }`}>Contributors</div>
        </div>
        <div className="text-center">
          <div className={`text-[18px] font-bold transition-colors ${
            isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}>{project.openIssues}</div>
          <div className={`text-[10px] transition-colors ${
            isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
          }`}>Issues</div>
        </div>
        <div className="text-center">
          <div className={`text-[18px] font-bold transition-colors ${
            isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}>{project.prs}</div>
          <div className={`text-[10px] transition-colors ${
            isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
          }`}>PRs</div>
        </div>
      </div>

      {/* One line of labels, never more.
          A repo carrying nine topics wrapped to four lines and made its whole
          grid row taller than the rows around it - measured at 304px against
          434-499px depending on width. Grid rows size to their tallest item
          and each row sizes independently, so this is a card-level problem and
          the card is where it is fixed; every grid showing one inherits it.

          The overflow becomes "+N" rather than disappearing, so a repo with
          more topics reads as having more. The full list is in the title. */}
      <div className="flex flex-nowrap items-center gap-1.5 mt-auto overflow-hidden">
        {visibleTags.map((tag) => (
          <span
            key={tag}
            title={tag}
            className={`shrink-0 max-w-[9rem] truncate px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-[0_2px_8px_rgba(201,152,58,0.15)] ${
              isDark
                ? 'bg-[#c9983a]/20 border border-[#c9983a]/40 text-[#f5c563]'
                : 'bg-[#c9983a]/20 border border-[#c9983a]/35 text-[#8b6f3a]'
            }`}
          >
            {tag}
          </span>
        ))}
        {hiddenTagCount > 0 && (
          <span
            title={hiddenTags.join(', ')}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              isDark
                ? 'bg-white/[0.06] border border-white/20 text-[#b8a898]'
                : 'bg-white/40 border border-white/30 text-[#6b5c4a]'
            }`}
          >
            +{hiddenTagCount}
          </span>
        )}
      </div>
    </motion.div>
    </SpotlightCard>
  );
}
