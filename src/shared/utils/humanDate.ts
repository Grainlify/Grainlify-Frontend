/**
 * A date the way a contributor reads one: "3 October 2026 at 01:17 UTC".
 *
 * The same format everywhere a deadline or an event is shown, so nobody sees
 * one moment written two ways and wonders whether they are the same.
 */
export const humanDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })} ${d.getUTCFullYear()} at ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
};
