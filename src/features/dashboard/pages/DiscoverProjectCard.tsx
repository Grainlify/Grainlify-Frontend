import { useState } from "react";
import { motion, type Variants } from "motion/react";
import { Heart, Star, GitFork } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

export type DiscoverProject = {
  id: string;
  name: string;
  icon: string;
  stars: string;
  forks: string;
  issues: number;
  description: string;
  tags: string[];
  color: string;
  ecosystem_name: string | null;
};

interface DiscoverProjectCardProps {
  project: DiscoverProject;
  onClick: () => void;
  variants?: Variants;
}

// Inner-content-card tier: rounded-[16px] + backdrop-blur-[30px] + resting/hover shadow.
export function DiscoverProjectCard({
  project,
  onClick,
  variants,
}: DiscoverProjectCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [avatarError, setAvatarError] = useState(false);
  const showAvatarImage = project.icon.startsWith("http") && !avatarError;

  return (
    <motion.div
      variants={variants}
      onClick={onClick}
      className={`flex flex-col h-full backdrop-blur-[30px] rounded-[16px] border p-6 transition-all cursor-pointer motion-safe:hover:-translate-y-1 active:scale-[0.98] ${
        isDark
          ? "bg-white/[0.08] border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.24)] hover:bg-white/[0.12] hover:shadow-[0_8px_24px_rgba(201,152,58,0.15)]"
          : "bg-white/[0.15] border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white/[0.2] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        {showAvatarImage ? (
          <img
            src={project.icon}
            alt={project.name}
            loading="lazy"
            decoding="async"
            className="w-12 h-12 rounded-[12px] border border-white/20 flex-shrink-0"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-[12px] bg-gradient-to-br ${project.color} flex items-center justify-center shadow-md flex-shrink-0`}
          >
            <span className="text-white font-bold text-lg">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <button
          className="text-[#c9983a] hover:text-[#a67c2e] transition-colors"
          aria-label="Save project"
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      <h4
        className={`text-[18px] font-bold mb-2 transition-colors ${
          isDark ? "text-[#f5f5f5]" : "text-[#2d2820]"
        }`}
      >
        {project.name}
      </h4>
      <p
        className={`text-[13px] mb-4 line-clamp-2 transition-colors ${
          isDark ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
        }`}
      >
        {project.description}
      </p>

      <div
        className={`flex items-center space-x-4 text-[13px] mb-4 transition-colors ${
          isDark ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
        }`}
      >
        <div className="flex items-center space-x-1">
          <Star className="w-3.5 h-3.5 text-[#c9983a]" />
          <span>{project.stars}</span>
        </div>
        <div className="flex items-center space-x-1">
          <GitFork className="w-3.5 h-3.5 text-[#c9983a]" />
          <span>{project.forks}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-auto">
        {project.ecosystem_name && (
          <span
            className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold ${
              isDark
                ? "bg-white/10 border-white/25 text-[#e8dfd0]"
                : "bg-white/20 border-white/30 text-[#2d2820]"
            }`}
          >
            {project.ecosystem_name}
          </span>
        )}
        {project.tags.map((tag, idx) => (
          <span
            key={idx}
            className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold shadow-[0_2px_8px_rgba(201,152,58,0.15)] ${
              isDark
                ? "bg-[#c9983a]/15 border-[#c9983a]/30 text-[#f5c563]"
                : "bg-[#c9983a]/20 border-[#c9983a]/35 text-[#8b6f3a]"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
