import type { LucideIcon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

// Inner-content-card tier: rounded-[16px] + backdrop-blur-[30px] + resting shadow,
// matching DiscoverPage.tsx's design tiers.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-[16px] border backdrop-blur-[30px] p-8 text-center transition-colors ${
        isDark
          ? "bg-white/[0.08] border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.24)]"
          : "bg-white/[0.15] border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
      } ${className}`}
    >
      <div
        className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center border bg-gradient-to-br ${
          isDark
            ? "from-[#c9983a]/20 to-[#a67c2e]/10 border-[#c9983a]/25"
            : "from-[#c9983a]/20 to-[#a67c2e]/10 border-[#c9983a]/25"
        }`}
      >
        <Icon className="w-6 h-6 text-[#c9983a]" />
      </div>

      <p
        className={`text-[16px] font-semibold mb-1 transition-colors ${
          isDark ? "text-[#f5f5f5]" : "text-[#2d2820]"
        }`}
      >
        {title}
      </p>

      {description && (
        <p
          className={`text-[14px] transition-colors ${
            isDark ? "text-[#d4d4d4]" : "text-[#7a6b5a]"
          }`}
        >
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[14px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.45)] transition-all border border-white/10"
        >
          {action.icon && <action.icon className="w-4 h-4" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
