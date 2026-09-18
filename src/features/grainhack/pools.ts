/** Formats a prize-pool figure for display.
 *
 * The API sends these as fixed-scale decimal strings straight from Postgres
 * `numeric` - "8.000000", not "8" - so rendering the value raw prints
 * "$8.000000". Both contributor-facing GrainHack pages did exactly that in
 * production, because their test fixtures used "8", a shape the API never
 * returns. Formatting here rather than at each call site means the next
 * surface to show a pool cannot repeat it.
 *
 * Returns null for an absent pool so callers decide their own empty copy,
 * rather than this inventing a "$0.00" for a pool that was never set.
 */
export function formatPoolUSD(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
