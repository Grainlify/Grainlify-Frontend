import type { ReactNode } from 'react'

export interface LeaderboardTableStateProps {
  /** Error message string. When truthy the error branch (role="alert") is rendered. */
  error?: string | null
  /** Heading shown in the empty branch. */
  emptyTitle?: string
  /** Supporting text shown below the empty heading. */
  emptyHint?: string
  /** Called when the user clicks "Try again". Only rendered in the error branch. */
  onRetry?: () => void
  /** Optional child content. Currently unused by this component. */
  children?: ReactNode
}

/**
 * Shared empty / error state renderer for the contributors and projects
 * leaderboard tables.
 *
 * Accessibility contract:
 * - **Error branch** renders `role="alert"` with `aria-live="assertive"` and
 *   optionally a "Try again" button (present only when `onRetry` is provided).
 * - **Empty branch** renders `role="status"` with `aria-live="polite"` and no
 *   retry action.
 * - The error branch **always takes precedence** over the empty branch
 *   whenever `error` is truthy, regardless of the `emptyTitle` / `emptyHint`
 *   props passed.
 */
export function LeaderboardTableState({
  error,
  emptyTitle = 'No data yet',
  emptyHint,
  onRetry,
}: LeaderboardTableStateProps) {
  // ── Error branch ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-900/20 bg-red-950/10 px-8 py-12 text-center backdrop-blur-xl"
      >
        <p className="text-lg font-semibold text-red-400">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-gradient-to-br from-[#c9983a] to-[#a67c2e] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-[#c9983a]/30 active:scale-95"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  // ── Empty branch (default) ────────────────────────────────────────────
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-8 py-12 text-center backdrop-blur-xl"
    >
      <p className="text-lg font-semibold text-[#b8a898]">{emptyTitle}</p>
      {emptyHint && <p className="text-sm text-[#8a7a6a]">{emptyHint}</p>}
    </div>
  )
}
