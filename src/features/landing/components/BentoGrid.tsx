import type { ReactNode } from "react";
import { cn } from "../../../shared/utils/cn";
import { useTheme } from "../../../shared/contexts/ThemeContext";

export function BentoGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 md:auto-rows-[16rem] gap-5", className)}>{children}</div>
  );
}

interface BentoGridItemProps {
  className?: string;
  title: string;
  description: string;
  icon: ReactNode;
}

// Adapted from Aceternity UI's Bento Grid (ui.aceternity.com/components/bento-grid):
// fixed auto-rows + per-item col/row spans for the varied "bento" sizing, and a
// group-hover translate on the text - same mechanics, gold glass styling.
export function BentoGridItem({ className, title, description, icon }: BentoGridItemProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "group/bento relative row-span-1 rounded-[24px] p-6 sm:p-8 flex flex-col justify-between overflow-hidden backdrop-blur-[40px] border transition-all duration-300 hover:-translate-y-1",
        isDark
          ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.11] hover:border-[#c9983a]/40"
          : "bg-white/[0.18] border-white/30 hover:bg-white/[0.25] hover:border-[#c9983a]/40",
        "hover:shadow-[0_16px_40px_rgba(201,152,58,0.18)]",
        className,
      )}
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#c9983a]/10 blur-3xl transition-opacity duration-300 opacity-0 group-hover/bento:opacity-100" />
      <div className="relative w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/15 border border-[#c9983a]/30 flex items-center justify-center shadow-[0_4px_12px_rgba(201,152,58,0.15)]">
        {icon}
      </div>
      <div className="relative transition-transform duration-300 group-hover/bento:translate-x-1.5">
        <h3 className={cn("text-lg sm:text-xl font-bold mb-2 transition-colors", isDark ? "text-[#e8dfd0]" : "text-[#2d2820]")}>
          {title}
        </h3>
        <p className={cn("text-sm leading-relaxed transition-colors", isDark ? "text-[#b8a898]" : "text-[#7a6b5a]")}>
          {description}
        </p>
      </div>
    </div>
  );
}
