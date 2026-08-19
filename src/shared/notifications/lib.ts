import type { AppNotification } from '../api/client';

/** Shared notification logic, used by both the page and the dropdown.
 *
 *  The two surfaces are one object at two sizes: the same grouping, the same
 *  labels, the same destination. Holding that in one module is the point -
 *  the last time "where does this link go" existed in two places, the two
 *  answers drifted and 43 rows ended up pointing at a route we do not serve.
 */

/** The item count above which the page shows search and the All/Unread toggle.
 *
 *  # Why eight
 *
 *  Eight rows is one viewport. At the tightened row height (~90px) plus a date
 *  header or two, eight rows is about 780px - a laptop screen. Below that the
 *  list is visible whole, and a control that narrows a list you can already see
 *  entire is chrome for a scale we do not have. Above it, scanning becomes
 *  scrolling and the controls start doing work.
 *
 *  # Why the exact number barely matters
 *
 *  Against live data (68 recipients, read 2026-08-20) the choice is almost
 *  insensitive: a threshold of 8 leaves 57 people with a bare page and gives 11
 *  the controls, and every threshold from 9 to 12 gives 58/10. Nobody on the
 *  platform holds between 9 and 12 notifications, so the whole range produces
 *  the same page for all but one person. Eight is therefore chosen from the
 *  layout argument above rather than fitted to the distribution, which is the
 *  right way round - the distribution will move and the viewport will not.
 */
export const CONTROLS_THRESHOLD = 8;

export type DateGroupKey = 'today' | 'week' | 'earlier';

export interface DateGroup {
  key: DateGroupKey;
  label: string;
  items: AppNotification[];
}

/** Today / This week / Earlier, in that order, skipping empty groups.
 *
 *  "Today" is the calendar day, not the last 24 hours, because that is what a
 *  person means by it: something from 11pm last night is yesterday at 1am, not
 *  "today" for another twenty-three hours.
 *
 *  `now` is injectable so the boundary can be tested without freezing clocks.
 */
export function groupByDate(items: AppNotification[], now: Date = new Date()): DateGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  // Seven calendar days including today, so "this week" is the six days behind
  // today rather than a rolling 168 hours.
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const buckets: Record<DateGroupKey, AppNotification[]> = { today: [], week: [], earlier: [] };
  for (const n of items) {
    const at = new Date(n.created_at);
    if (at >= startOfToday) buckets.today.push(n);
    else if (at >= startOfWeek) buckets.week.push(n);
    else buckets.earlier.push(n);
  }

  const labels: Record<DateGroupKey, string> = {
    today: 'Today',
    week: 'This week',
    earlier: 'Earlier',
  };
  return (['today', 'week', 'earlier'] as const)
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ key: k, label: labels[k], items: buckets[k] }));
}

/** An absolute timestamp, deliberately.
 *
 *  A relative "2 minutes ago" needs a timer to stay honest, and a page left
 *  open renders a stale one indefinitely. Absolute is unambiguous and needs
 *  nothing running. Seconds are dropped - they were noise in a list.
 */
export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** The canonical address of the notifications surface, optionally anchored at
 *  one notification.
 *
 *  Not the /notifications alias: an internal link should not take a redirect
 *  hop to reach its own surface. The anchor always resolves from the dropdown,
 *  and that is a guarantee rather than a hope - the dropdown lists the newest
 *  ten and the page loads the newest twenty-five, both ORDER BY created_at
 *  DESC, so anything clickable in the dropdown is inside the page's first load.
 */
export function notificationsPagePath(id?: string): string {
  const base = '/dashboard?tab=notifications';
  return id ? `${base}&n=${encodeURIComponent(id)}` : base;
}

/** Case-insensitive match over what a person can actually see in the row.
 *
 *  Title and body only. Searching the type string would let "kyc" match a row
 *  whose visible text contains no such word, which reads as a broken search
 *  rather than a clever one.
 */
export function matchesQuery(n: AppNotification, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${n.title} ${n.body ?? ''}`.toLowerCase().includes(needle);
}

/** What the link out of a notification should say.
 *
 *  Named per type rather than a generic "View", because "Go to verification"
 *  tells somebody what they are about to do and "View" makes them click to find
 *  out. Falls back to something honest for types added later.
 */
export function linkLabel(type: string): string {
  switch (type) {
    case 'kyc_reset':
      return 'Go to verification';
    case 'referral_completed':
    case 'social_follow_completed':
    case 'founding_position':
      return 'Go to rewards';
    case 'issue_assigned':
    case 'issue_application_received':
    case 'issue_application_submitted':
    case 'issue_application_rejected':
      return 'Go to the issue';
    case 'pr_merged':
      return 'Go to the project';
    default:
      return 'Open';
  }
}
