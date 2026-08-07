import { useRef } from "react";
import { flushSync } from "react-dom";

interface UseThemeToggleAnimationOptions {
  onToggle: () => void;
  duration?: number;
}

// Circle-reveal theme toggle via the View Transitions API, centered on the
// trigger button. Replaces `react-theme-switch-animation`, which had two
// confirmed bugs: a perspective/transform hack for large displays that broke
// the clip-path animation in Chrome, and an inconsistent circle origin
// between browser engines. This mirrors the standard documented pattern
// (see Chrome's own View Transitions demos) without either.
export function useThemeToggleAnimation({
  onToggle,
  duration = 600,
}: UseThemeToggleAnimationOptions) {
  const ref = useRef<HTMLButtonElement>(null);

  const toggleWithAnimation = () => {
    const supportsViewTransition =
      typeof (document as any).startViewTransition === "function";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!ref.current || !supportsViewTransition || prefersReducedMotion) {
      onToggle();
      return;
    }

    const { top, left, width, height } = ref.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = (document as any).startViewTransition(() => {
      flushSync(() => {
        onToggle();
      });
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  return { ref, toggleWithAnimation };
}
