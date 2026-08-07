import { Bell } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../../app/components/ui/dropdown-menu";
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

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsDropdown({ showMobileNav, closeMobileNav }: NotificationsDropdownProp) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const darkTheme = theme === "dark";
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

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
    getNotifications({ limit: 10 })
      .then((data) => {
        if (!cancelled) setNotifications(data.notifications);
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
  }, [isOpen]);

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.read_at) {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      );
      setNotificationCount((prev) => Math.max(0, prev - 1));
      markNotificationRead(n.id).catch((error) =>
        console.error("Failed to mark notification read:", error)
      );
    }
    if (n.link_path) {
      navigate(n.link_path);
      closeMobileNav();
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    setNotificationCount(0);
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    }
  };

  // Format count for display (99+ for counts over 99)
  const formatCount = (count: number): string => {
    return count > 99 ? "99+" : count.toString();
  };

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
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
        className={`w-80 rounded-[18px] backdrop-blur-[40px] border shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_20px_rgba(201,152,58,0.15)] overflow-hidden p-0 ${
          darkTheme
            ? "bg-white/[0.08] border-white/15"
            : "bg-white/[0.15] border-white/25"
        }`}
      >
        {/* Header */}
        <DropdownMenuLabel
          className={`px-4 py-4 border-b flex items-center justify-between ${
            darkTheme ? "border-white/10" : "border-white/20"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkTheme ? "bg-white/[0.12]" : "bg-white/[0.2]"
              }`}
            >
              <Bell
                className={`w-5 h-5 ${darkTheme ? "text-[#c9983a]" : "text-[#c9983a]"}`}
              />
            </div>
            <div className="flex-1">
              <p
                className={`font-semibold text-sm ${
                  darkTheme ? "text-[#e8dfd0]" : "text-[#2d2820]"
                }`}
              >
                Notifications
              </p>
            </div>
          </div>
          {notifications.some((n) => !n.read_at) && (
            <button
              onClick={handleMarkAllRead}
              className={`text-[11px] font-medium ${darkTheme ? "text-[#c9983a] hover:text-[#f5c563]" : "text-[#a2792c] hover:text-[#8b6f3a]"}`}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>

        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <p className={`text-xs ${darkTheme ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>Loading...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left px-4 py-3 border-b transition-colors ${
                  darkTheme ? "border-white/[0.06] hover:bg-white/[0.06]" : "border-black/[0.04] hover:bg-black/[0.03]"
                } ${!n.read_at ? (darkTheme ? "bg-[#c9983a]/[0.06]" : "bg-[#c9983a]/[0.08]") : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && (
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#c9983a] flex-shrink-0" />
                  )}
                  <div className={`flex-1 min-w-0 ${n.read_at ? "ml-3.5" : ""}`}>
                    <p className={`text-[13px] font-semibold truncate ${darkTheme ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className={`text-[12px] mt-0.5 line-clamp-2 ${darkTheme ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
                        {n.body}
                      </p>
                    )}
                    <p className={`text-[11px] mt-1 ${darkTheme ? "text-[#8a7a6a]" : "text-[#9a8a7a]"}`}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div
            className={`px-4 py-12 flex flex-col items-center justify-center ${
              darkTheme ? "text-[#b8a898]" : "text-[#7a6b5a]"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                darkTheme ? "bg-white/[0.08]" : "bg-white/[0.15]"
              }`}
            >
              <Bell
                className={`w-8 h-8 ${darkTheme ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}
              />
            </div>
            <p
              className={`text-sm font-medium mb-1 ${
                darkTheme ? "text-[#e8dfd0]" : "text-[#2d2820]"
              }`}
            >
              No notifications yet
            </p>
            <p className="text-xs text-center max-w-[200px]">
              You'll see updates about your contributions, rewards, and project
              activity here.
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
