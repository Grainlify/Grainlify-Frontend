import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "../../../shared/utils/cn";

export interface ParallaxTile {
  key: string;
  src: string;
  label: string;
}

interface ParallaxScrollProps {
  items: ParallaxTile[];
  className?: string;
}

// Adapted from Aceternity UI's Parallax Scroll (ui.aceternity.com/components/parallax-scroll):
// same three-column, scroll-linked-transform technique, but bound to the page's
// own scroll as this section passes through the viewport (offset "start end" to
// "end start") rather than the original demo's boxed inner-scroll panel - a
// nested scrollbar reads as a bug on a marketing page, where the whole page
// scrolling past is the expected gesture.
export function ParallaxScroll({ items, className }: ParallaxScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const translateFirst = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const translateSecond = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const translateThird = useTransform(scrollYProgress, [0, 1], [0, -120]);

  const third = Math.ceil(items.length / 3);
  const columns = [items.slice(0, third), items.slice(third, 2 * third), items.slice(2 * third)];
  const translates = [translateFirst, translateSecond, translateThird];

  return (
    <div ref={sectionRef} className={cn("w-full", className)}>
      <div className="grid grid-cols-3 gap-3 sm:gap-5 md:gap-6 max-w-5xl mx-auto">
        {columns.map((column, colIdx) => (
          <motion.div key={colIdx} style={{ y: translates[colIdx] }} className="grid gap-3 sm:gap-5 md:gap-6">
            {column.map((tile) => (
              <div
                key={tile.key}
                className="group relative aspect-square rounded-[16px] sm:rounded-[20px] overflow-hidden border border-white/20 bg-white/[0.08] backdrop-blur-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 hover:border-[#c9983a]/50 hover:shadow-[0_12px_32px_rgba(201,152,58,0.25)]"
              >
                <img
                  src={tile.src}
                  alt={tile.label}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.visibility = "hidden";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2 sm:p-3">
                  <span className="text-white text-[10px] sm:text-xs font-semibold truncate">{tile.label}</span>
                </div>
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
