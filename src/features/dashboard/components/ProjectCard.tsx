import { Star, GitFork, Package } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useState, memo } from 'react';

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
}

/**
 * Custom comparison function for ProjectCard to optimize rendering performance.
 * It performs a shallow comparison of the project object's core properties
 * and checks referential equality for the onClick handler.
 *
 * @param prevProps - The previous props of the component
 * @param nextProps - The next props of the component
 * @returns true if props are considered equal, false otherwise
 */
const areProjectPropsEqual = (prevProps: ProjectCardProps, nextProps: ProjectCardProps) => {
  if (prevProps.onClick !== nextProps.onClick) return false;

  const p1 = prevProps.project;
  const p2 = nextProps.project;

  return (
    p1.id === p2.id &&
    p1.name === p2.name &&
    p1.stars === p2.stars &&
    p1.forks === p2.forks &&
    p1.contributors === p2.contributors &&
    p1.openIssues === p2.openIssues &&
    p1.prs === p2.prs &&
    p1.description === p2.description &&
    p1.color === p2.color &&
    p1.icon === p2.icon &&
    // Shallow array comparison for tags
    p1.tags.length === p2.tags.length &&
    p1.tags.every((tag, index) => tag === p2.tags[index])
  );
};

/**
 * ProjectCard component displays project information in a card format.
 * Memoized to prevent unnecessary re-renders when parent list re-renders.
 * Uses a custom comparison function for fine-grained control over re-renders.
 */
export const ProjectCard = memo(function ProjectCard({ project, onClick }: ProjectCardProps) {
  const { theme } = useTheme();
  const [avatarError, setAvatarError] = useState(false);

  // Check if icon is a URL (GitHub avatar) or emoji/text
  const isAvatarUrl = project.icon.startsWith('http');

  return (
    <div
      data-testid={`project-card-${project.id}`}
      className={`backdrop-blur-[30px] rounded-[18px] border p-5 transition-all cursor-pointer ${
        theme === 'dark'
          ? 'bg-white/[0.08] border-white/15 hover:bg-white/[0.12] hover:shadow-[0_8px_24px_rgba(201,152,58,0.15)]'
          : 'bg-white/[0.15] border-white/25 hover:bg-white/[0.2] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
      }`}
      onClick={() => onClick?.(project.id.toString())}
    >
      <div className="flex items-start justify-between mb-4">
        {isAvatarUrl && !avatarError ? (
          <img
            src={project.icon}
            alt={project.name}
            className="w-11 h-11 rounded-[12px] border border-white/20 flex-shrink-0"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className={`w-11 h-11 rounded-[12px] bg-gradient-to-br ${project.color} flex items-center justify-center shadow-md ${
            isAvatarUrl ? '' : 'text-xl'
          }`}>
            {isAvatarUrl ? (
              <Package className="w-6 h-6 text-white" />
            ) : (
              project.icon
            )}
          </div>
        )}
      </div>

      <h4 className={`text-[16px] font-bold mb-2 transition-colors ${
        theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
      }`}>{project.name}</h4>
      <p className={`text-[12px] mb-4 line-clamp-2 transition-colors ${
        theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
      }`}>{project.description}</p>

      <div className={`flex items-center space-x-3 text-[12px] mb-4 transition-colors ${
        theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
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
            theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}>{project.contributors}</div>
          <div className={`text-[10px] transition-colors ${
            theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
          }`}>Contributors</div>
        </div>
        <div className="text-center">
          <div className={`text-[18px] font-bold transition-colors ${
            theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}>{project.openIssues}</div>
          <div className={`text-[10px] transition-colors ${
            theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
          }`}>Issues</div>
        </div>
        <div className="text-center">
          <div className={`text-[18px] font-bold transition-colors ${
            theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}>{project.prs}</div>
          <div className={`text-[10px] transition-colors ${
            theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
          }`}>PRs</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {project.tags.map((tag) => (
          <span
            key={`${project.id}-${tag}`}
            className={`px-2 py-1 rounded-[8px] text-[11px] font-semibold shadow-[0_2px_8px_rgba(201,152,58,0.1)] ${
              theme === 'dark'
                ? 'bg-[#c9983a]/20 border border-[#c9983a]/40 text-[#f5c563]'
                : 'bg-[#c9983a]/20 border border-[#c9983a]/35 text-[#8b6f3a]'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}, areProjectPropsEqual);
