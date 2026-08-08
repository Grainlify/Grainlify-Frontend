import { useEffect, useState, type ElementType, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { motion } from "motion/react";
import { cn } from "../../../shared/utils/cn";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const DIRECTIONS: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];

// Gold-tuned radial gradients standing in for Aceternity's default white/blue
// ones - same four-position "comet" that orbits the border, same bloom-to-full
// highlight on hover, recolored to the platform's own #c9983a/#d4af37 palette.
const MOVING_MAP: Record<Direction, string> = {
  TOP: "radial-gradient(20.7% 50% at 50% 0%, #f5d78e 0%, rgba(245, 215, 142, 0) 100%)",
  LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, #f5d78e 0%, rgba(245, 215, 142, 0) 100%)",
  BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, #f5d78e 0%, rgba(245, 215, 142, 0) 100%)",
  RIGHT: "radial-gradient(16.2% 41.2% at 100% 50%, #f5d78e 0%, rgba(245, 215, 142, 0) 100%)",
};

const HIGHLIGHT = "radial-gradient(75% 181% at 50% 50%, #d4af37 0%, rgba(212,175,55,0) 100%)";

interface HoverBorderGradientProps<T extends ElementType = "button"> {
  as?: T;
  containerClassName?: string;
  className?: string;
  bgClassName?: string;
  duration?: number;
  clockwise?: boolean;
  children: ReactNode;
}

// Adapted from Aceternity UI's Hover Border Gradient
// (ui.aceternity.com/components/hover-border-gradient): a radial-gradient
// "comet" cycles TOP -> LEFT -> BOTTOM -> RIGHT behind a solid inner pill,
// blooming into a full highlight on hover - recolored gold, direction/duration
// otherwise identical to the original technique.
export function HoverBorderGradient<T extends ElementType = "button">({
  as,
  containerClassName,
  className,
  bgClassName = "bg-[#1a1512]",
  duration = 1,
  clockwise = true,
  children,
  ...props
}: HoverBorderGradientProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof HoverBorderGradientProps<T>>) {
  const Tag = (as || "button") as ElementType;
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  useEffect(() => {
    if (hovered) return;
    const rotate = () => {
      setDirection((prev) => {
        const i = DIRECTIONS.indexOf(prev);
        const next = clockwise ? (i - 1 + DIRECTIONS.length) % DIRECTIONS.length : (i + 1) % DIRECTIONS.length;
        return DIRECTIONS[next];
      });
    };
    const interval = setInterval(rotate, duration * 1000);
    return () => clearInterval(interval);
  }, [hovered, duration, clockwise]);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex items-center justify-center rounded-[16px] border border-white/10 content-center overflow-visible p-px w-fit transition-transform hover:scale-[1.02]",
        containerClassName,
      )}
      {...props}
    >
      <div className={cn("relative z-10 w-auto text-white px-6 sm:px-8 py-3 sm:py-4 rounded-[15px]", bgClassName, className)}>
        {children}
      </div>
      <motion.div
        className="flex-none inset-0 overflow-hidden absolute z-0 rounded-[16px]"
        style={{ filter: "blur(4px)" }}
        initial={{ background: MOVING_MAP[direction] }}
        animate={{ background: hovered ? [MOVING_MAP[direction], HIGHLIGHT] : MOVING_MAP[direction] }}
        transition={{ ease: "linear", duration }}
      />
      <div className={cn("absolute z-[1] inset-[1.5px] rounded-[15px]", bgClassName)} />
    </Tag>
  );
}
