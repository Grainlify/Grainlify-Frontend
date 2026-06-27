import { Star, GitFork, Package } from 'lucide-react';
import { useState } from 'react';

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

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [avatarError, setAvatarError] = useState(false);

  // Check if icon is a URL (GitHub avatar) or emoji/text
  const isAvatarUrl = project.icon.startsWith('http');

  return (
    <div
      className="backdrop-blur-[30px] rounded-[18px] border p-5 transition-all cursor-pointer bg-card-bg border-card-border hover:bg-card-hover-bg hover:shadow-card-hover"
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

      <h4 className="text-[16px] font-bold mb-2 transition-colors text-foreground">{project.name}</h4>
      <p className="text-[12px] mb-4 line-clamp-2 transition-colors text-input-placeholder">{project.description}</p>

      <div className="flex items-center space-x-3 text-[12px] mb-4 transition-colors text-input-placeholder">
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
          <div className="text-[18px] font-bold transition-colors text-foreground">{project.contributors}</div>
          <div className="text-[10px] transition-colors text-input-placeholder">Contributors</div>
        </div>
        <div className="text-center">
          <div className="text-[18px] font-bold transition-colors text-foreground">{project.openIssues}</div>
          <div className="text-[10px] transition-colors text-input-placeholder">Issues</div>
        </div>
        <div className="text-center">
          <div className="text-[18px] font-bold transition-colors text-foreground">{project.prs}</div>
          <div className="text-[10px] transition-colors text-input-placeholder">PRs</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {project.tags.map((tag, idx) => (
          <span
            key={idx}
            className="px-2 py-1 rounded-[8px] text-[11px] font-semibold shadow-[0_2px_8px_rgba(201,152,58,0.1)] bg-tag-bg border border-tag-border text-tag-text"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
