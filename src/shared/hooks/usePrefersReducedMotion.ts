import { useState, useEffect } from 'react'

/**
 * Returns whether the user prefers reduced motion, based on the
 * `(prefers-reduced-motion: reduce)` media query.
 *
 * Automatically listens for changes and updates the returned value.
 * Returns `false` during SSR (no `window` / no `matchMedia`).
 */
export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return reducedMotion
}