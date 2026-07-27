# Plan: Add `prefers-reduced-motion` Support to `LeaderboardHero`

## Context

`LeaderboardHero.tsx` renders 8 decorative CSS animation classes (`animate-twinkle-slow`, `animate-glow-pulse`, `animate-glow-pulse-delayed`, `animate-float`, `animate-float-delayed`, `animate-float-slow`, `animate-shimmer`, `animate-bounce-slow`, `animate-wiggle`, `animate-wiggle-delayed`, `animate-pulse-slow`) and entrance animations via `isLoaded` (`translate-y`, `scale`) regardless of the user's motion preference. Other components in the codebase (`FallingPetals`, `SkeletonLoader`) already detect `prefers-reduced-motion: reduce` inline — there is no shared hook. This task adds the same detection to `LeaderboardHero` using the existing project pattern.

---

## Files to Modify

1. **`src/features/leaderboard/components/LeaderboardHero.tsx`** — Add reduced-motion detection and conditional classes
2. **`src/features/leaderboard/components/LeaderboardHero.test.tsx`** — New test file (does not exist yet)

---

## Step 1: Modify `LeaderboardHero.tsx`

### Add reduced-motion detection (reusing the `FallingPetals` pattern)

Add at the top of the file, before the component:

```tsx
function getPrefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

Add `useState`/`useEffect` hooks inside the component:

```tsx
import { useState, useEffect } from 'react'
// ... existing imports ...

export function LeaderboardHero({ leaderboardType, isLoaded, children }: LeaderboardHeroProps) {
  const { theme } = useTheme()
  const [reducedMotion, setReducedMotion] = useState(getPrefersReducedMotion)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // ... rest of component
}
```

### Disable decorative animations conditionally

When `reducedMotion` is true, omit the `animate-*` classes from decorative elements. The elements themselves remain visible (static). Specific changes:

| Element | Normal | Reduced Motion |
|---|---|---|
| Outer container (line 16) | `isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'` | `isLoaded ? 'opacity-100' : 'opacity-0'` (fade only, no translate) |
| Glow divs (lines 22-25) | `animate-glow-pulse` / `animate-glow-pulse-delayed` | Remove `animate-*` class |
| Sparkle divs (line 33) | `animate-twinkle-slow` | Remove `animate-*` class |
| Floating rings (lines 45-47) | `animate-float` / `animate-float-delayed` / `animate-float-slow` | Remove `animate-*` class |
| Title section (line 52) | `isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'` | `isLoaded ? 'opacity-100' : 'opacity-0'` (fade only, no translate) |
| Shimmer underline (line 62) | `animate-shimmer` | Remove `animate-*` class |
| Crown (line 66) | `animate-bounce-slow` | Remove `animate-*` class |
| Podium section (line 88) | `isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'` | `isLoaded ? 'opacity-100' : 'opacity-0'` (fade only, no scale) |
| Trophy icons (lines 97-99) | `animate-wiggle` / `animate-wiggle-delayed` | Remove `animate-*` class |
| Star icons (line 103, 109) | `animate-pulse-slow` | Remove `animate-*` class |

### Implementation approach

Use conditional class strings with ternary expressions based on `reducedMotion`:

```tsx
const outerClass = reducedMotion
  ? `... ${isLoaded ? 'opacity-100' : 'opacity-0'}`
  : `... ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`

// Similarly for sparkle div:
className={`absolute w-1 h-1 bg-[#c9983a]/50 rounded-full${reducedMotion ? '' : ' animate-twinkle-slow'}`}
```

Also add `transition-none` when `reducedMotion` is true to remove the CSS transition effects on the entrance animation containers (which currently use `transition-all duration-1000`).

---

## Step 2: Create `LeaderboardHero.test.tsx`

Follow the `FallingPetals.test.tsx` testing conventions:

- `// @vitest-environment jsdom` docblock
- Import from `vitest` (`describe`, `it`, `expect`, `vi`, `beforeEach`)
- Import from `@testing-library/react` (`render`, `screen`, `waitFor`)
- Use `renderWithTheme` wrapper (since component uses `useTheme`)
- Reuse `makeMediaQuery` + `mockMatchMedia` helper pattern from `FallingPetals.test.tsx`

### Test 1 — Reduced Motion (decorative animations absent)

```tsx
it('removes decorative animation classes when reduced motion is preferred', () => {
  mockMatchMedia(true)
  renderWithTheme(<LeaderboardHero leaderboardType="contributors" isLoaded={true}><div /></LeaderboardHero>)

  // Verify animation classes are not present
  const container = document.querySelector('[class*="animate-twinkle"]')
  expect(container).toBeNull()
  // Also verify specific elements don't have animation classes
  // Check glow divs, sparkle divs, etc.
})
```

### Test 2 — Normal Motion (animations present)

```tsx
it('keeps animation classes when reduced motion is not preferred', () => {
  mockMatchMedia(false)
  renderWithTheme(<LeaderboardHero leaderboardType="contributors" isLoaded={true}><div /></LeaderboardHero>)

  // Verify animation classes ARE present on relevant elements
  expect(document.querySelector('.animate-twinkle-slow')).toBeInTheDocument()
  expect(document.querySelector('.animate-glow-pulse')).toBeInTheDocument()
  // etc.
})
```

### Test 3 — Content Reveal (reduced motion uses opacity only)

```tsx
it('uses opacity-only reveal when reduced motion is enabled', () => {
  mockMatchMedia(true)
  renderWithTheme(<LeaderboardHero leaderboardType="contributors" isLoaded={true}><div /></LeaderboardHero>)

  // The outer container should be visible (opacity-100) without translate/scale
  const outer = document.querySelector('[class*="min-h-"]')
  expect(outer).toHaveClass('opacity-100')
  expect(outer?.className).not.toMatch(/translate/)
  expect(outer?.className).not.toMatch(/scale/)

  // Content should still be visible
  expect(screen.getByRole('heading', { name: /seasonal contributors/i })).toBeInTheDocument()
})
```

### Test 4 — Edge case: isLoaded false → true under reduced motion

```tsx
it('shows content with opacity fade when isLoaded transitions under reduced motion', async () => {
  mockMatchMedia(true)
  const { rerender } = renderWithTheme(
    <LeaderboardHero leaderboardType="contributors" isLoaded={false}><div>child</div></LeaderboardHero>
  )
  // Initially not visible
  const outer = document.querySelector('[class*="min-h-"]')
  expect(outer?.className).toContain('opacity-0')

  rerender(
    <LeaderboardHero leaderboardType="contributors" isLoaded={true}><div>child</div></LeaderboardHero>
  )
  // Now visible with opacity-100, no translate/scale
  expect(outer?.className).toContain('opacity-100')
  expect(outer?.className).not.toMatch(/translate/)
  expect(outer?.className).not.toMatch(/scale/)
})
```

---

## Step 3: Run Validation

```bash
npm test -- --run LeaderboardHero
```

Ensure all new tests pass and no existing tests break.

---

## Summary

- **Detection**: Reuses the same inline `getPrefersReducedMotion` + `matchMedia` pattern from `FallingPetals.tsx` (no new utility, consistent with codebase conventions)
- **Decorative animations**: All `animate-*` classes are conditionally omitted when reduced motion is active; elements remain visible but static
- **Content reveal**: `translate` and `scale` transforms are replaced with simple opacity fade
- **Tests**: 4 tests covering reduced-motion, normal-motion, content visibility, and runtime transition — following existing `FallingPetals.test.tsx` patterns
