import { useTheme } from '../../../shared/contexts/ThemeContext'

/**
 * Props for {@link LeaderboardTableState}.
 *
 * The component renders the non-data states shared by the contributors and
 * projects tables: an accessible empty state and an error state with a retry
 * action. The loading state is intentionally not handled here — callers keep
 * rendering their existing table skeletons during the loading phase.
 */
export interface LeaderboardTableStateProps {
  /**
   * Generic, user-facing error message. When set, the error state takes
   * precedence over the empty state.
   *
   * Security: callers MUST pass copy that reveals no internals (no stack
   * traces, HTTP status text or backend messages); this value is rendered
   * verbatim.
   */
  error?: string | null
  /**
   * Retry handler wired to the underlying data source. When provided alongside
   * an `error`, a "Try again" button is rendered that re-triggers the fetch.
   */
  onRetry?: () => void
  /** Heading shown in the empty state, e.g. "No contributors yet". */
  emptyTitle: string
  /** Supporting copy shown beneath the empty-state heading. */
  emptyHint: string
}

/** Shared visual styling for the retry call-to-action. */
const RETRY_CLASSES =
  'mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-[14px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[14px] shadow-[0_6px_24px_rgba(162,121,44,0.4)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.5)] transition-all border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'

/**
 * Renders the empty or error state for a leaderboard table.
 *
 * State changes are announced to assistive technology: the empty state uses a
 * polite `role="status"` live region, while the error state uses an assertive
 * `role="alert"` so failures are surfaced promptly. Both are wrapped in an
 * `aria-live` region so a transition (e.g. data -> error after a failed retry)
 * is read out.
 */
export function LeaderboardTableState({
  error,
  onRetry,
  emptyTitle,
  emptyHint,
}: LeaderboardTableStateProps) {
  const { theme } = useTheme()
  const muted = theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
  const strong = theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'

  if (error) {
    return (
      <div role="alert" aria-live="assertive" className="px-8 py-12 text-center">
        <p className={`text-[15px] font-bold transition-colors ${strong}`}>Something went wrong</p>
        <p className={`mt-1 text-[13px] transition-colors ${muted}`}>{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className={RETRY_CLASSES}>
            Try again
          </button>
        )}
      </div>
    )
  }

  return (
    <div role="status" aria-live="polite" className="px-8 py-12 text-center">
      <p className={`text-[15px] font-bold transition-colors ${strong}`}>{emptyTitle}</p>
      <p className={`mt-1 text-[13px] transition-colors ${muted}`}>{emptyHint}</p>
    </div>
  )
}
