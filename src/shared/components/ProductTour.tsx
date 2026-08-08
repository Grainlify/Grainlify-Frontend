import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export interface TourStep {
  /** Matches a `data-tour-id` in the page, or 'center' to show as a plain centered card. */
  targetId: string | "center";
  title: string;
  description: string;
}

interface ProductTourProps {
  steps: TourStep[];
  onDone: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

export function ProductTour({ steps, onDone }: ProductTourProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const measure = useCallback(() => {
    if (!step || step.targetId === "center") {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
    if (!el) {
      // Target isn't mounted (e.g. role-gated nav item) — skip straight past it
      // rather than showing a spotlight pointing at nothing.
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step, steps.length]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const goNext = useCallback(() => {
    if (isLast) {
      onDone();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [isLast, onDone]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      else if (e.key === "ArrowRight" || e.key === "Enter") goNext();
      else if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goBack, onDone]);

  if (!step) return null;

  // Tooltip placement: prefer to the right of the target (matches the fixed icon
  // rail's position on the left edge); fall back to centered if there's no target.
  const tooltipStyle = rect
    ? {
        position: "fixed" as const,
        top: Math.min(Math.max(rect.top + rect.height / 2 - 90, 16), window.innerHeight - 260),
        left: rect.left + rect.width + 20,
      }
    : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Backdrop — absorbs all clicks so the tour can only be advanced via its own controls */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Spotlight cutout around the current target, drawn via a huge box-shadow spread
          rather than a clip-path/mask, so it stays correct with zero extra math. */}
      {rect && (
        <motion.div
          className="absolute rounded-[14px] pointer-events-none"
          initial={false}
          animate={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            boxShadow:
              "0 0 0 2px #c9983a, 0 0 24px 4px rgba(201,152,58,0.5), 0 0 0 9999px rgba(0,0,0,0.65)",
          }}
        />
      )}

      {/* No mode="wait" - each step should crossfade in immediately as the previous
          one leaves, not wait for a full sequential exit-then-enter, since users
          click through several steps in quick succession. */}
      <AnimatePresence>
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={`w-[300px] rounded-[20px] border backdrop-blur-[40px] shadow-[0_16px_48px_rgba(0,0,0,0.35)] p-5 ${
            rect ? "" : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px]"
          } ${isDark ? "bg-[#2d2820]/95 border-white/15" : "bg-[#fdfaf5]/97 border-black/10"}`}
          style={tooltipStyle}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c9983a] flex-shrink-0" />
              <span className={`text-[11px] font-bold tracking-wide uppercase ${isDark ? "text-[#8a7d6f]" : "text-[#a89685]"}`}>
                {stepIndex + 1} of {steps.length}
              </span>
            </div>
            <button
              onClick={onDone}
              aria-label="Close tour"
              className={`p-1 rounded-full transition-colors ${isDark ? "text-[#8a7d6f] hover:text-[#f5f5f5] hover:bg-white/10" : "text-[#a89685] hover:text-[#2d2820] hover:bg-black/5"}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className={`text-[16px] font-bold mb-1.5 ${isDark ? "text-[#f5f5f5]" : "text-[#2d2820]"}`}>{step.title}</h3>
          <p className={`text-[13px] leading-relaxed mb-5 ${isDark ? "text-[#d4d4d4]" : "text-[#7a6b5a]"}`}>{step.description}</p>

          <div className="flex items-center justify-between gap-3">
            {!isFirst ? (
              <button
                onClick={goBack}
                className={`inline-flex items-center gap-1 text-[13px] font-semibold transition-colors ${isDark ? "text-[#b8a898] hover:text-[#f5f5f5]" : "text-[#7a6b5a] hover:text-[#2d2820]"}`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <button
                onClick={onDone}
                className={`text-[13px] font-semibold transition-colors ${isDark ? "text-[#b8a898] hover:text-[#f5f5f5]" : "text-[#7a6b5a] hover:text-[#2d2820]"}`}
              >
                Skip tour
              </button>
            )}
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white text-[13px] font-semibold shadow-[0_4px_14px_rgba(162,121,44,0.35)] hover:shadow-[0_6px_18px_rgba(162,121,44,0.45)] transition-all"
            >
              {isLast ? "Get started" : "Next"}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}
