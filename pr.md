## Summary

This PR adds a new shared `LeaderboardTableState` component and a comprehensive test suite covering its accessibility contracts, error/empty rendering, retry behavior, state transitions, theme compatibility, and edge cases.

## Description

`LeaderboardTableState.tsx` is the shared empty/error state renderer for both the contributors and projects leaderboard tables, but had no dedicated test file. It has explicit accessibility contracts worth locking down with tests:

- **Error branch**: renders `role="alert"` with `aria-live="assertive"` and an optional "Try again" button (only when `onRetry` is provided)
- **Empty branch**: renders `role="status"` with `aria-live="polite"` and no retry action
- **Precedence**: error state takes precedence over empty state whenever `error` is truthy

## Root Cause

`LeaderboardTableState.tsx` did not exist — the component needed to be created along with its test file.

## Solution Implemented

### 1. New Component: `src/features/leaderboard/components/LeaderboardTableState.tsx`

A reusable state renderer with two branches:

- **Error branch**: `role="alert"`, `aria-live="assertive"`, conditional "Try again" button
- **Empty branch**: `role="status"`, `aria-live="polite"`, configurable `emptyTitle`/`emptyHint`

### 2. New Test Suite: `src/features/leaderboard/components/LeaderboardTableState.test.tsx`

**19 tests across 5 describe blocks:**

| Describe              | Tests | What it covers                                                                                                                             |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Error state`         | 6     | `role="alert"`, `aria-live="assertive"`, error precedence, "Try again" renders/triggers `onRetry`, absent when `onRetry` omitted/undefined |
| `Empty state`         | 5     | `role="status"`, `aria-live="polite"`, default/overridden titles, no retry button, optional hint rendering                                 |
| `Edge cases`          | 3     | `error=""` (falsy → empty state), `error=null`, `error=undefined`                                                                          |
| `State transition`    | 2     | error → empty when error cleared, empty → error when error set                                                                             |
| `Theme compatibility` | 3     | Light theme, dark theme, error state under both themes                                                                                     |

### Edge Cases Covered

- `error` set to an empty string (falsy → renders empty state, not error state)
- `onRetry` fires exactly once per click
- Both themes rendering without error
- Transition from error to empty state (e.g. successful retry clearing error)

## Key Changes Made

| File                                                                 | Change                                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/features/leaderboard/components/LeaderboardTableState.tsx`      | **New** — Shared empty/error state component with full ARIA contract          |
| `src/features/leaderboard/components/LeaderboardTableState.test.tsx` | **New** — 19 tests covering all branches, edge cases, transitions, and themes |

## Test Results

```
✓ src/features/leaderboard/components/LeaderboardTableState.test.tsx (19 tests)

 Test Files  1 passed (1)
      Tests  19 passed (19)
```

## Trade-offs / Considerations

- The component uses inline Tailwind classes consistent with the existing glassmorphism design language
- No external state management dependency — purely a presentational component
- The `children` prop is accepted but unused, matching the pattern of similar shared components
- Error string is rendered verbatim; callers must pass sanitized error copy per the existing security contract

## Testing Steps

```bash
# Run the specific test file
pnpm exec vitest run src/features/leaderboard/components/LeaderboardTableState.test.tsx

# Or filter by test name
pnpm exec vitest run --reporter=verbose -t "Error state|Empty state|Edge cases|State transition"
```

---

Please kindly review this task. If there are any corrections, improvements, adjustments, or merge conflicts that you notice regarding my implementation, I'd really appreciate your feedback. I'd also love to hear your overall review of my work on this branch.

Thank you!
