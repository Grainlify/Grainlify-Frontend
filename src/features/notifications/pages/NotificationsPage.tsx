import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../../../shared/api/client';

const PAGE_SIZE = 25;

/**
 * /notifications — every notification, in full, at length.
 *
 * # Why a page and not a taller dropdown
 *
 * The dropdown shows ten, clipped to two lines, and clicking one navigates
 * away. So the only gesture that expands a message is the same gesture that
 * leaves it, and for a KYC feedback notification — where the body IS the
 * message, the sentence telling somebody what to fix — there was nowhere in the
 * product to read the rest.
 *
 * # Reading is not an action
 *
 * A row here is fully visible already, so nothing needs clicking to be read.
 * That makes the click that marks read a deliberate one, and it must therefore
 * do exactly that and nothing else: no navigation, no removal, no reordering.
 * A message that jumps away the moment you touch it is the same defect as one
 * you cannot finish reading.
 *
 * Where a notification has somewhere to go, that is a separate, explicit link
 * inside the row. The row marks read; the link travels. Two gestures, because
 * they are two intentions.
 *
 * # Read on click, not read on open
 *
 * Visiting must not clear the badge. The badge means "there is something you
 * have not seen", and a glance at a list is not having seen them.
 */
export function NotificationsPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  const load = useCallback(async (offset: number) => {
    const res = await getNotifications({ limit: PAGE_SIZE, offset });
    const batch = res.notifications ?? [];
    // Fewer than a full page means the end. The API returns no total, and
    // asking for one would be a second query for a number only used to hide a
    // button.
    setHasMore(batch.length === PAGE_SIZE);
    return batch;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const batch = await load(0);
        if (!cancelled) setItems(batch);
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
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const batch = await load(items.length);
      setItems((prev) => [...prev, ...batch]);
    } catch {
      toast.error("Couldn't load more notifications.");
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (n: AppNotification) => {
    if (n.read_at) return;
    const stamp = new Date().toISOString();
    // Optimistic, and REVERTED on failure. The dropdown's version swallowed the
    // error, so the UI reported read on its own authority while the server
    // still had it unread — a write that fails silently under an interface
    // claiming success.
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: stamp } : x)));
    try {
      await markNotificationRead(n.id);
    } catch {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: null } : x)));
      toast.error("Couldn't mark that as read. It's still unread.");
    }
  };

  const markAll = async () => {
    const previous = items;
    const stamp = new Date().toISOString();
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || stamp })));
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(previous);
      toast.error("Couldn't mark everything as read.");
    }
  };

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div
      className={`min-h-screen px-4 sm:px-6 py-10 transition-colors ${
        dark
          ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
          : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'
      }`}
    >
      <div className="max-w-3xl mx-auto">
        <Link
          to="/dashboard"
          className={`inline-flex items-center gap-2 mb-6 text-[14px] font-medium transition-colors ${muted} hover:${strong}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex items-baseline justify-between mb-5">
          <h1 className={`text-[24px] font-bold ${strong}`}>Notifications</h1>
          {unread > 0 && (
            <button onClick={markAll} className={`text-[13px] font-medium underline ${muted}`}>
              Mark all as read
            </button>
          )}
        </div>

        {loading && <p className={`text-[14px] ${muted}`}>Loading…</p>}

        {loadFailed && (
          <p className={`text-[14px] ${muted}`}>
            Couldn't load your notifications. This doesn't affect them — reload to try again.
          </p>
        )}

        {!loading && !loadFailed && items.length === 0 && (
          <p className={`text-[14px] ${muted}`}>Nothing here yet.</p>
        )}

        <ul className="flex flex-col gap-3">
          {items.map((n) => (
            <li key={n.id}>
              {/* The row marks read. It does not navigate, remove, or reorder. */}
              <button
                type="button"
                onClick={() => markRead(n)}
                aria-label={n.read_at ? `${n.title} (read)` : `Mark "${n.title}" as read`}
                className={`w-full text-left rounded-[16px] border p-4 transition-colors ${
                  dark ? 'border-white/10' : 'border-white/30'
                } ${
                  n.read_at
                    ? dark
                      ? 'bg-white/[0.03]'
                      : 'bg-white/[0.20]'
                    : dark
                      ? 'bg-[#c9983a]/[0.08]'
                      : 'bg-[#c9983a]/[0.10]'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && (
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#c9983a] flex-shrink-0" />
                  )}
                  <div className={`flex-1 ${n.read_at ? 'ml-3.5' : ''}`}>
                    <p className={`text-[15px] font-semibold ${strong}`}>{n.title}</p>
                    {n.body && (
                      // Full body, never clamped, and pre-line because a
                      // paragraph break somebody typed is part of what they meant.
                      <p className={`text-[14px] mt-1 whitespace-pre-line ${muted}`}>{n.body}</p>
                    )}
                    <p className={`text-[12px] mt-2 ${muted}`}>
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>

              {/* Separate from the row, deliberately. Reading and travelling are
                  two intentions, and collapsing them is what made the message
                  unreadable in the first place. */}
              {n.link_path && (
                <Link
                  to={n.link_path}
                  className={`inline-block mt-2 ml-1 text-[13px] font-semibold underline ${
                    dark ? 'text-[#c9983a]' : 'text-[#a67c2e]'
                  }`}
                >
                  {linkLabel(n.type)}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className={`mt-5 px-4 py-2 rounded-[12px] text-[13px] font-semibold border ${
              dark ? 'border-white/15 text-[#e8dfd0]' : 'border-white/40 text-[#2d2820]'
            } disabled:opacity-60`}
          >
            {loadingMore ? 'Loading…' : 'Load older'}
          </button>
        )}
      </div>
    </div>
  );
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
