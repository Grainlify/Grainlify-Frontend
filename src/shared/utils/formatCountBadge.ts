/**
 * Formats a count value for display in a badge, with overflow protection.
 *
 * - 0..99 => exact count (truncated to integer)
 * - >= 100 => "99+"
 * - Negative / NaN / Infinity => "0"
 */
export function formatCountBadge(count: number): string {
  const safe = Number.isFinite(count) ? Math.max(0, count) : 0
  if (safe >= 100) return '99+'
  return String(Math.trunc(safe))
}
