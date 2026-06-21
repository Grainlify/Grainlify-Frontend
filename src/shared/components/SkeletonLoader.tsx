import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'default' | 'circle' | 'text';
  width?: string;
  height?: string;
}

/**
 * Tracks the user's reduced-motion preference so skeletons can render a static
 * placeholder instead of relying only on CSS to stop the animation.
 */
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

export function SkeletonLoader({ className, variant = 'default', width, height }: SkeletonLoaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const prefersReducedMotion = usePrefersReducedMotion();

  const baseClasses = `relative overflow-hidden ${
    variant === 'circle' 
      ? 'rounded-full' 
      : variant === 'text'
      ? 'rounded-[100px]'
      : 'rounded-[12px]'
  }`;

  const bgColor = isDark 
    ? 'bg-white/[0.08]' 
    : 'bg-white/[0.12]';

  const shimmerGradient = isDark
    ? 'from-transparent via-white/[0.15] to-transparent'
    : 'from-transparent via-white/[0.25] to-transparent';

  const style: CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  const motionClasses = prefersReducedMotion
    ? 'translate-x-0'
    : '-translate-x-full animate-shimmer';

  return (
    <div 
      className={`${baseClasses} ${bgColor} ${className || ''}`}
      style={style}
    >
      <div 
        className={`absolute inset-0 ${motionClasses} bg-gradient-to-r ${shimmerGradient}`}
        data-testid="skeleton-shimmer"
      />
    </div>
  );
}
