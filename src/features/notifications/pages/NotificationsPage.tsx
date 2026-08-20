import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Check, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { NotificationRow } from '../../../shared/notifications/NotificationRow';
import {
  CONTROLS_THRESHOLD,
  groupByDate,
  matchesQuery,
} from '../../../shared/notifications/lib';
import {
  getNotificationCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../../../shared/api/client';

const PAGE_SIZE = 25;

/**
 * The notifications page — every notification, in full, at length.
 *
 * # Why a page and not a taller dropdown
 *
 * The dropdown shows ten and clamps the body to three lines. That clamp is only
 * safe because this page exists and shows the whole message; a KYC feedback
 * notification's body IS the message, the sentence telling somebody what to
 * fix, and there was previously nowhere in the product to read the rest.
 *
 * # Reading is not an action
 *
 * A row here is fully visible already, so nothing needs clicking to be read.
 * That makes the click that marks read a deliberate one, and it must therefore
 * do exactly that and nothing else: no navigation, no removal, no reordering.
 *
 * # Read on click, not read on open
 *
 * Visiting must not clear the badge. The badge means "there is something you
 * have not seen", and a glance at a list is not having seen them.
 *
 * # Why the controls are conditional
 *
 * The median inbox on this platform holds ONE notification; 57 of 68 people
 * hold eight or fewer. A search field and a filter above a single row are the
 * same defect as a page of dead space, pointing the other way — chrome for a
 * scale we do not have. So below CONTROLS_THRESHOLD the page is a header and a
 * list, and above it the tools appear.
 */
export function NotificationsPage() {
  const { theme } = useTheme();
  const location = useLocation();
  const dark = theme === 'dark';
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  /** How many the unfiltered list holds.
   *
   *  The controls are gated on THIS, never on what is currently displayed. Gate
   *  them on the filtered result and filtering to Unread can drop the list below
   *  the threshold, removing the control that did the filtering and stranding
   *  somebody in a view they cannot leave.
   */
  const [baselineCount, setBaselineCount] = useState(0);

  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  const load = useCallback(async (offset: number, onlyUnread: boolean) => {
    const res = await getNotifications({ limit: PAGE_SIZE, offset, unreadOnly: onlyUnread });
    const batch = res.notifications ?? [];
    // Fewer than a full page means the end. The API returns no total, and
    // asking for one would be a second query for a number only used to hide a
    // button.
    setHasMore(batch.length === PAGE_SIZE);
    return batch;
  }, []);

  // The unread badge, from the same endpoint the bell uses. Counting the loaded
  // rows instead would report "25 unread" to somebody holding 47.
  useEffect(() => {
    let cancelled = false;
    getNotificationCount()
      .then((r) => {
        if (!cancelled) setUnreadCount(r?.count ?? 0);
      })
      .catch(() => {
        /* The list is the page; a missing count must not take it down. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const batch = await load(0, unreadOnly);
        if (cancelled) return;
        setItems(batch);
        setLoadFailed(false);
        // Only an unfiltered load establishes the baseline.
        if (!unreadOnly) setBaselineCount(batch.length);
      } catch {
        // Distinguished from "you have none". A blank list where a failure
        // happened reads as an answer rather than a missing one.
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, unreadOnly]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const batch = await load(items.length, unreadOnly);
      setItems((prev) => [...prev, ...batch]);
      if (!unreadOnly) setBaselineCount((prev) => prev + batch.length);
    } catch {
      toast.error("Couldn't load more notifications.");
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (n: AppNotification) => {
    if (n.read_at) return;
    const stamp = new Date().toISOString();
    // Optimistic, and REVERTED on failure. Swallowing the error left the UI
    // reporting read on its own authority while the server still had it unread
    // — a write that fails silently under an interface claiming success.
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: stamp } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(n.id);
    } catch {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: null } : x)));
      setUnreadCount((c) => c + 1);
      toast.error("Couldn't mark that as read. It's still unread.");
    }
  };

  const markAll = async () => {
    const previous = items;
    const previousCount = unreadCount;
    const stamp = new Date().toISOString();
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || stamp })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(previous);
      setUnreadCount(previousCount);
      toast.error("Couldn't mark everything as read.");
    }
  };

  // Arrived from a dropdown row: find it, centre it, ring it briefly. The ring
  // is a state class rather than an animation so it survives reduced-motion.
  const anchorId = new URLSearchParams(location.search).get('n');
  const anchoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!anchorId || loading) return;
    if (anchoredFor.current === anchorId) return;
    if (!items.some((n) => n.id === anchorId)) return;
    anchoredFor.current = anchorId;
    document.getElementById(`notification-${anchorId}`)?.scrollIntoView({ block: 'center' });
    setHighlighted(anchorId);
    const t = setTimeout(() => setHighlighted(null), 2500);
    return () => clearTimeout(t);
  }, [anchorId, items, loading]);

  // Search runs over what is loaded, in the browser. Said plainly rather than
  // implied to be server-side, and the shortfall is reported below rather than
  // presented as "no results" — see the note beside that line.
  const visible = useMemo(
    () => (query.trim() ? items.filter((n) => matchesQuery(n, query)) : items),
    [items, query]
  );
  const groups = useMemo(() => groupByDate(visible), [visible]);

  const showControls = baselineCount > CONTROLS_THRESHOLD;
  const searching = query.trim().length > 0;

  const segment = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3.5 py-1.5 rounded-[9px] text-[12.5px] font-semibold transition-all ${
        active
          ? dark
            ? 'bg-[#a17932] text-white'
            : 'bg-[#b8872f] text-white'
          : dark
            ? 'text-[#d4d4d4] hover:text-[#f5f5f5]'
            : 'text-[#6b5d4d] hover:text-[#2d2820]'
      }`}
    >
      {label}
    </button>
  );

  return (
    // No page shell and no background: Dashboard supplies both. Centred rather
    // than left-aligned — the content area is max-w-[1400px], so a left-aligned
    // 768px column pinned ~630px of dead space to the right of every row, which
    // is what made the page read as unfinished. 640px keeps the body near a
    // 70-character measure.
    <div className="max-w-[840px] mx-auto">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div className="flex items-baseline gap-2.5">
          <h1 className={`text-[22px] font-bold tracking-tight ${strong}`}>Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-[3px] rounded-full bg-[#c9983a] text-white text-[11px] font-bold leading-none tabular-nums">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className={`text-[12.5px] font-medium underline ${muted}`}>
            Mark all as read
          </button>
        )}
      </div>

      {showControls && (
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className={`inline-flex items-center p-[3px] rounded-[12px] border ${
              dark ? 'bg-white/[0.06] border-white/15' : 'bg-white/[0.2] border-white/30'
            }`}
          >
            {segment('All', !unreadOnly, () => setUnreadOnly(false))}
            {segment('Unread', unreadOnly, () => setUnreadOnly(true))}
          </div>
          <div className="relative flex-1">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`}
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications"
              aria-label="Search notifications"
              className={`w-full pl-9 pr-3 py-2 rounded-[12px] border text-[12.5px] focus:outline-none transition-all ${
                dark
                  ? 'bg-white/[0.06] border-white/15 text-[#f5efe5] placeholder-[#b8a898] focus:border-[#c9983a]/40'
                  : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a] focus:border-[#c9983a]/40'
              }`}
            />
          </div>
        </div>
      )}

      {loading && <p className={`text-[14px] ${muted}`}>Loading…</p>}

      {loadFailed && (
        <p className={`text-[14px] ${muted}`}>
          Couldn't load your notifications. This doesn't affect them — reload to try again.
        </p>
      )}

      {!loading && !loadFailed && visible.length === 0 && (
        <EmptyState
          dark={dark}
          // Three different emptinesses, and saying which one it is matters.
          // An empty list under an active filter that reads "you have none" is
          // the same class of lie as a blank where a failed load belongs.
          {...(searching
            ? {
                icon: 'search' as const,
                title: 'No matches',
                body: `Nothing loaded here matches “${query.trim()}”.`,
              }
            : unreadOnly
              ? {
                  icon: 'check' as const,
                  title: "You're all caught up",
                  body: 'Nothing unread. Switch to All to see your earlier notifications.',
                }
              : {
                  icon: 'bell' as const,
                  title: 'No notifications yet',
                  body: "You'll see updates about your applications, merged pull requests and rewards here.",
                })}
        />
      )}

      {groups.map((g) => (
        <div key={g.key} className="mb-5 last:mb-0">
          <div className="flex items-center gap-3 mb-2">
            {/* Not `muted`. Measured against the page background this label
                lands at 1.84:1 in the light theme — it is 11px, so WCAG's
                large-text allowance does not apply and 4.5 is the bar. The
                strong token measures 5.26:1 and, at this size and tracking,
                still reads as a quiet section marker rather than a heading
                competing with the titles below it. */}
            <h2
              className={`text-[11px] font-bold uppercase tracking-[0.11em] ${
                dark ? 'text-[#b8a898]' : 'text-[#2d2820]'
              }`}
            >
              {g.label}
            </h2>
            <span
              aria-hidden
              className={`flex-1 h-px ${dark ? 'bg-white/[0.13]' : 'bg-[#7a6b5a]/[0.28]'}`}
            />
          </div>
          {/* One card per group with hairline dividers, rather than a card per
              row. Kills the 12px inter-row gap, gives the page an edge to
              align to, and makes this and the dropdown the same object. */}
          <ul
            className={`rounded-[16px] border overflow-hidden backdrop-blur-[30px] ${
              dark
                ? 'bg-white/[0.06] border-white/[0.13] shadow-[0_4px_16px_rgba(0,0,0,0.24)]'
                : 'bg-white/[0.25] border-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
            }`}
          >
            {g.items.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                variant="page"
                dark={dark}
                onActivate={markRead}
                highlighted={highlighted === n.id}
              />
            ))}
          </ul>
        </div>
      ))}

      {/* The shortfall, stated. A client-side search over a loaded page that
          reports "no matches" while unloaded rows sit behind a button is
          answering a narrower question than the one asked — the same shape as
          checking a link's address and never following it. */}
      {searching && hasMore && (
        <p className={`mt-3 text-[12.5px] ${muted}`}>
          Searching the {items.length} notifications loaded so far. Load older to search further
          back.
        </p>
      )}

      {hasMore && !searching && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className={`mt-4 px-4 py-2 rounded-[12px] text-[13px] font-semibold border ${
            dark ? 'border-white/15 text-[#e8dfd0]' : 'border-white/40 text-[#2d2820]'
          } disabled:opacity-60`}
        >
          {loadingMore ? 'Loading…' : 'Load older'}
        </button>
      )}
    </div>
  );
}

function EmptyState({
  dark,
  icon,
  title,
  body,
}: {
  dark: boolean;
  icon: 'bell' | 'check' | 'search';
  title: string;
  body: string;
}) {
  const Icon = icon === 'bell' ? Bell : icon === 'check' ? Check : Search;
  return (
    <div
      className={`rounded-[16px] border backdrop-blur-[30px] px-6 py-8 text-center ${
        dark
          ? 'bg-white/[0.08] border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.24)]'
          : 'bg-white/[0.15] border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="w-14 h-14 mx-auto mb-3.5 rounded-full flex items-center justify-center border border-[#c9983a]/25 bg-gradient-to-br from-[#c9983a]/20 to-[#a67c2e]/10">
        <Icon className="w-6 h-6 text-[#c9983a]" />
      </div>
      <p className={`text-[15px] font-semibold mb-1 ${dark ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
        {title}
      </p>
      <p
        className={`text-[13.5px] max-w-[34ch] mx-auto ${dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}
      >
        {body}
      </p>
    </div>
  );
}

export { linkLabel } from '../../../shared/notifications/lib';
