import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { getOnBrandGradient } from "../../../shared/utils/motionVariants";

export interface Testimonial {
  quote: string;
  name: string;
  designation: string;
}

interface AnimatedTestimonialsProps {
  testimonials: Testimonial[];
  autoplay?: boolean;
}

// Adapted from Aceternity UI's Animated Testimonials
// (ui.aceternity.com/components/animated-testimonials): a rotated, depth-stacked
// card deck on one side with the active card popping forward, and a word-by-word
// blur-in reveal for the quote on the other - same mechanics as the original,
// swapping its photo stack for initial-letter gradient avatars (the app's own
// existing fallback-avatar convention, not a guessed stock-photo URL) and its
// tabler icons for lucide-react to match the rest of this codebase.
export function AnimatedTestimonials({ testimonials, autoplay = false }: AnimatedTestimonialsProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [active, setActive] = useState(0);

  const handleNext = () => setActive((prev) => (prev + 1) % testimonials.length);
  const handlePrev = () => setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  const isActive = (index: number) => index === active;

  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(handleNext, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  // Stable per-card rotation (not re-rolled every render) so cards don't jitter.
  const rotations = useMemo(
    () => testimonials.map(() => Math.floor(Math.random() * 14) - 7),
    [testimonials.length],
  );

  const current = testimonials[active];

  return (
    <div className="max-w-sm md:max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        {/* Card stack */}
        <div className="relative h-64 sm:h-72 md:h-80 w-full max-w-xs mx-auto md:max-w-none" style={{ perspective: "1000px" }}>
          <AnimatePresence>
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, scale: 0.9, rotate: rotations[index] }}
                animate={{
                  opacity: isActive(index) ? 1 : 0.6,
                  scale: isActive(index) ? 1 : 0.94,
                  rotate: isActive(index) ? 0 : rotations[index],
                  zIndex: isActive(index) ? 999 : testimonials.length - index,
                  y: isActive(index) ? [0, -30, 0] : 0,
                }}
                exit={{ opacity: 0, scale: 0.9, rotate: rotations[index] }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="absolute inset-0 origin-bottom"
              >
                <div
                  className={`h-full w-full rounded-[28px] flex items-center justify-center border shadow-[0_16px_40px_rgba(0,0,0,0.18)] bg-gradient-to-br ${getOnBrandGradient(testimonial.name)} ${
                    isDark ? "border-white/15" : "border-white/40"
                  }`}
                >
                  <span className="text-white text-6xl sm:text-7xl font-black drop-shadow-md select-none">
                    {testimonial.name.charAt(0)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Quote */}
        <div className="flex flex-col justify-between">
          <motion.div key={active} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
            <h3 className={`text-xl sm:text-2xl font-bold transition-colors ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
              {current.name}
            </h3>
            <p className={`text-sm mb-6 transition-colors ${isDark ? "text-[#c9983a]" : "text-[#a67c2e]"}`}>{current.designation}</p>
            <p className={`text-base sm:text-lg leading-relaxed transition-colors ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
              {current.quote.split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ filter: "blur(8px)", opacity: 0, y: 4 }}
                  animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut", delay: 0.02 * i }}
                  className="inline-block"
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </p>
          </motion.div>

          <div className="flex gap-3 pt-8 md:pt-0">
            <button
              onClick={handlePrev}
              aria-label="Previous testimonial"
              className={`group/btn w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-[30px] transition-all ${
                isDark ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.14]" : "bg-white/[0.2] border-white/30 hover:bg-white/[0.3]"
              }`}
            >
              <ArrowLeft className={`w-4 h-4 transition-transform group-hover/btn:-translate-x-0.5 ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`} />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next testimonial"
              className={`group/btn w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-[30px] transition-all ${
                isDark ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.14]" : "bg-white/[0.2] border-white/30 hover:bg-white/[0.3]"
              }`}
            >
              <ArrowRight className={`w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`} />
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              {testimonials.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => setActive(i)}
                  aria-label={`Show testimonial from ${t.name}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active ? "w-6 bg-[#c9983a]" : `w-1.5 ${isDark ? "bg-white/20" : "bg-black/15"}`
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
