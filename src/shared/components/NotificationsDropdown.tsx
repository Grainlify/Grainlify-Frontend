import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../../app/components/ui/dropdown-menu";
import { NotificationRow } from "../notifications/NotificationRow";
import { CONTROLS_THRESHOLD, notificationsPagePath } from "../notifications/lib";
import {
  getNotificationCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "../api/client";

interface NotificationsDropdownProp {
  showMobileNav: boolean;
  closeMobileNav: () => void;
}

const DROPDOWN_SIZE = 10;

/** The bell, and the ten newest notifications.
 *
 *  # Its job, and what follows from it
 *
 *  Two questions only: "is there anything?" and "take me to it". Everything
 *  here is one of those, and the page is where a notification is actually read.
 *
 *  # Why a row goes to the PAGE rather than to link_path
 *
 *  "Take me to it" means the notification, not the action. That distinction is
 *  what makes the three-line clamp below safe: clamping the body while the row
 *  clicked through to link_path would reproduce the original bug one layer
 *  over — text you cannot finish, and a click that takes you somewhere the rest
 *  is never shown. link_path survives as an explicit labelled link inside the
 *  row, exactly as on the page.
 *
 *  The anchor always resolves. This lists the newest ten and the page loads the
 *  newest twenty-five, both ORDER BY created_at DESC, so anything clickable
 *  here is inside the page's first load.
 */
export function NotificationsDropdown({ showMobileNav, closeMobileNav }: NotificationsDropdownProp) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const darkTheme = theme === "dark";
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  /** Size of the unfiltered list — see NotificationsPage for why the control
   *  is gated on this rather than on what is currently displayed. */
  const [baselineCount, setBaselineCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const data = await getNotificationCount();
      setNotificationCount(data.count ?? 0);
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 60000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    getNotifications({ limit: DROPDOWN_SIZE, unreadOnly })
      .then((data) => {
        if (cancelled) return;
        const batch = data.notifications ?? [];
        setNotifications(batch);
        if (!unreadOnly) setBaselineCount(batch.length);
      })
      .catch((error) => {
        console.error("Failed to fetch notifications:", error);
        if (!cancelled) setNotifications([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, unreadOnly]);

  /** Marks read, then goes to the notification on the page. */
  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read_at) {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      );
      setNotificationCount((prev) => Math.max(0, prev - 1));
      // Reverted on failure. Swallowing this left the UI reporting read on its
      // own authority while the server still had it unread - a write that fails
      // silently under an interface claiming success.
      markNotificationRead(n.id).catch(() => {
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read_at: null } : x))
        );
        setNotificationCount((prev) => prev + 1);
        toast.error("Couldn't mark that as read. It's still unread.");
      });
    }
    setIsOpen(false);
    closeMobileNav();
    navigate(notificationsPagePath(n.id));
  };

  const handleMarkAllRead = async () => {
    const previous = notifications;
    const previousCount = notificationCount;
    setNotifications((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    setNotificationCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      setNotifications(previous);
      setNotificationCount(previousCount);
      toast.error("Couldn't mark everything as read.");
    }
  };

  // Format count for display (99+ for counts over 99)
  const formatCount = (count: number): string => {
    return count > 99 ? "99+" : count.toString();
  };

  const showToggle = baselineCount > CONTROLS_THRESHOLD;

  const segment = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1 rounded-[9px] text-[12px] font-semibold transition-all ${
        active
          ? darkTheme
            ? "bg-[#a17932] text-white"
            : "bg-[#b8872f] text-white"
          : darkTheme
            ? "text-[#d4d4d4] hover:text-[#f5f5f5]"
            : "text-[#6b5d4d] hover:text-[#2d2820]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          // The bell had no accessible name: a screen reader announced it as
          // "button" with no indication of what it opens, and nothing could
          // select it by role and name.
          aria-label="Notifications"
          className={`h-[46px] w-[46px] rounded-full relative items-center justify-center backdrop-blur-[40px] transition-all hover:scale-105 shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] ${
            darkTheme ? "bg-[#2d2820] " : "bg-[#d4c5b0] "
          }
          ${showMobileNav ? "flex w-[80%] max-w-[800px] rounded-sm" : "hidden lg:flex"}`}
        >
          <div
            className={`absolute inset-0 pointer-events-none ${showMobileNav? 'rounded-sm': 'rounded-full'} ${
              darkTheme
                ? "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.5),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.11)]"
                : "shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.15),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.35)]"
            }`}
          />
          <Bell
            className={`w-4 h-4 relative z-10 transition-colors ${
              darkTheme
                ? "text-[rgba(255,255,255,0.69)]"
                : "text-[rgba(45,40,32,0.75)]"
            }`}
          />
  {
          showMobileNav && <span className={`ml-2 ${darkTheme ? 'text-[#e8dfd0]' : 'text-[#2d2820]'}`}>
          Notification
          </span>
               }
          {/* Notification Count Badge - Only show when count > 0; high-contrast for visibility */}
          {notificationCount > 0 && (
            <div
              className={`absolute -top-0.5 -right-0.5 lg:-top-1 lg:-right-1 min-w-[18px] h-[18px] px-1 rounded-full z-20 border-2 flex items-center justify-center ${
                darkTheme
                  ? "bg-[#2d2820] border-[#c9983a] text-[#fef5e7] shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  : "bg-[#2d2820] border-white/90 text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
              }`}
            >
              <span className="text-[10px] font-bold leading-none tabular-nums">
                {formatCount(notificationCount)}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        // 384px rather than 320: the toggle needs the room, and at 320 a body
        // wrapped into a ribbon. Desktop only - the trigger is hidden lg:flex.
        className={`w-96 rounded-[18px] backdrop-blur-[40px] border shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_20px_rgba(201,152,58,0.15)] overflow-hidden p-0 ${
          darkTheme
            ? "bg-white/[0.08] border-white/15"
            : "bg-white/[0.15] border-white/25"
        }`}
      >
        {/* Header. The 38px bell medallion that used to sit here was a
            restatement of the button you just clicked; the count is what the
            header is actually for. */}
        <DropdownMenuLabel
          className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-3 ${
            darkTheme ? "border-white/10" : "border-white/20"
          }`}
        >
          <div className="flex items-baseline gap-2">
            <p className={`font-semibold text-[13.5px] ${darkTheme ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
              Notifications
            </p>
            {notificationCount > 0 && (
              <span className="px-2 py-[3px] rounded-full bg-[#c9983a] text-white text-[11px] font-bold leading-none tabular-nums">
                {formatCount(notificationCount)}
              </span>
            )}
          </div>
          {notifications.some((n) => !n.read_at) && (
            <button
              onClick={handleMarkAllRead}
              className={`text-[11.5px] font-semibold ${darkTheme ? "text-[#c9983a] hover:text-[#f5c563]" : "text-[#a2792c] hover:text-[#8b6f3a]"}`}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>

        {/* Same rule as the page: below the threshold this is a control for a
            list you can already see whole. */}
        {showToggle && (
          <div className={`px-3.5 py-2 border-b ${darkTheme ? "border-white/10" : "border-white/20"}`}>
            <div
              className={`inline-flex items-center p-[3px] rounded-[12px] border ${
                darkTheme ? "bg-white/[0.06] border-white/15" : "bg-white/[0.2] border-white/30"
              }`}
            >
              {segment("All", !unreadOnly, () => setUnreadOnly(false))}
              {segment("Unread", unreadOnly, () => setUnreadOnly(true))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <p className={`text-xs ${darkTheme ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>Loading...</p>
          </div>
        ) : notifications.length > 0 ? (
          <ul className="max-h-[360px] overflow-y-auto">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                variant="dropdown"
                dark={darkTheme}
                onActivate={handleNotificationClick}
                onLinkNavigate={() => {
                  setIsOpen(false);
                  closeMobileNav();
                }}
              />
            ))}
          </ul>
        ) : (
          <div
            className={`px-4 py-10 flex flex-col items-center justify-center ${
              darkTheme ? "text-[#b8a898]" : "text-[#7a6b5a]"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mb-3.5 border border-[#c9983a]/25 bg-gradient-to-br from-[#c9983a]/20 to-[#a67c2e]/10`}
            >
              <Bell className="w-6 h-6 text-[#c9983a]" />
            </div>
            <p
              className={`text-sm font-semibold mb-1 ${
                darkTheme ? "text-[#e8dfd0]" : "text-[#2d2820]"
              }`}
            >
              {unreadOnly ? "You're all caught up" : "No notifications yet"}
            </p>
            <p className="text-xs text-center max-w-[220px]">
              {unreadOnly
                ? "Nothing unread. Switch to All to see your earlier notifications."
                : "You'll see updates about your applications, merged pull requests and rewards here."}
            </p>
          </div>
        )}

        {/* Attached to the list rather than floating under it. The canonical
            URL, not the /notifications alias - an internal link should not take
            a redirect hop to reach its own surface. */}
        <Link
          to={notificationsPagePath()}
          onClick={() => setIsOpen(false)}
          className={`block px-4 py-2.5 text-[12.5px] font-semibold text-center border-t ${
            darkTheme ? "border-white/10 text-[#c9983a]" : "border-black/10 text-[#a67c2e]"
          }`}
        >
          See all notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
