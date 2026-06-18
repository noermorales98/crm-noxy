"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  InboxIcon,
  UserMultipleIcon,
  BrowserIcon,
} from "@hugeicons/core-free-icons";

// ── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = "NEW_EMAIL" | "NEW_CONTACT" | "NEW_FORM_LEAD";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  entityId: string | null;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  refresh: () => void;
}

// ── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 30_000; // 30 s while tab is visible

const TYPE_ICONS: Record<NotificationType, any> = {
  NEW_EMAIL: InboxIcon,
  NEW_CONTACT: UserMultipleIcon,
  NEW_FORM_LEAD: BrowserIcon,
};

// ── Context ───────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popups, setPopups] = useState<AppNotification[]>([]);

  // ISO timestamp used as the `?since=` cursor for incremental polls
  const lastFetchAtRef = useRef<string | null>(null);
  // Prevents showing popups for the initial batch of old notifications
  const initialLoadDone = useRef(false);
  // Notifications that arrived while the tab was hidden — shown on focus
  const hiddenQueueRef = useRef<AppNotification[]>([]);

  // ── Core fetch ────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(
    async (detectNew = false) => {
      if (!session?.user) return;
      try {
        const pollStart = new Date().toISOString();

        const url =
          detectNew && lastFetchAtRef.current
            ? `/api/notifications?since=${encodeURIComponent(lastFetchAtRef.current)}`
            : "/api/notifications";

        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        const incoming: AppNotification[] = data.notifications ?? [];

        if (detectNew) {
          // Always advance the cursor regardless of results
          lastFetchAtRef.current = pollStart;

          if (initialLoadDone.current && incoming.length > 0) {
            // Prepend new notifications to the list
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n.id));
              const fresh = incoming.filter((n) => !existingIds.has(n.id));
              return [...fresh, ...prev].slice(0, 50);
            });

            // Show popups only if the tab is currently visible.
            // If hidden, queue them so they appear the moment the user returns.
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
              setPopups((prev) => [...prev, ...incoming].slice(-5));
            } else {
              hiddenQueueRef.current = [
                ...hiddenQueueRef.current,
                ...incoming,
              ].slice(-5);
            }
          }
        } else {
          // Initial full load
          setNotifications(incoming);
          lastFetchAtRef.current = pollStart;
          initialLoadDone.current = true;
        }

        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // silently ignore network errors
      }
    },
    [session]
  );

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications(false);
  }, [session, fetchNotifications]);

  // ── Interval — only runs while tab is visible ─────────────────────────────

  useEffect(() => {
    if (!session?.user) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(() => fetchNotifications(true), POLL_INTERVAL);
    };

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // 1. Flush any notifications that arrived while the tab was hidden
        if (hiddenQueueRef.current.length > 0) {
          setPopups((prev) =>
            [...prev, ...hiddenQueueRef.current].slice(-5)
          );
          hiddenQueueRef.current = [];
        }

        // 2. Immediately poll to catch anything the paused interval missed
        fetchNotifications(true);

        // 3. Resume the interval
        start();
      } else {
        // Tab is hidden — pause polling to avoid wasted requests
        stop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // Start polling immediately (tab is visible on mount)
    if (document.visibilityState === "visible") start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session, fetchNotifications]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "PATCH" }).catch(() => {});
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
    await fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const clearAll = useCallback(async () => {
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    setUnreadCount(0);
    await Promise.all(
      ids.map((id) => fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {}))
    );
  }, [notifications]);

  const dismissPopup = useCallback((id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refresh: () => fetchNotifications(false),
      }}
    >
      {children}

      {/* ── Floating popup stack ─────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-[9990] flex flex-col-reverse gap-2 pointer-events-none">
        {popups.map((n) => (
          <NotificationPopup
            key={n.id}
            notification={n}
            onDismiss={dismissPopup}
            onRead={markAsRead}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}

// ── Popup card ────────────────────────────────────────────────────────────────

function NotificationPopup({
  notification,
  onDismiss,
  onRead,
}: {
  notification: AppNotification;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}) {
  const Icon = TYPE_ICONS[notification.type] ?? InboxIcon;

  // Auto-dismiss after 6 s — only starts when the component mounts (tab is visible)
  useEffect(() => {
    const t = setTimeout(() => onDismiss(notification.id), 6000);
    return () => clearTimeout(t);
  }, [notification.id, onDismiss]);

  const handleClick = () => {
    onRead(notification.id);
    onDismiss(notification.id);
  };

  const inner = (
    <div className="flex items-start gap-3 w-full">
      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
        <HugeiconsIcon icon={Icon} size={15} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight truncate">
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="pointer-events-auto w-80 relative">
      {notification.link ? (
        <Link
          href={notification.link}
          onClick={handleClick}
          className="flex items-start bg-accent-charcoal rounded-lg px-4 py-3 pr-9 hover:opacity-90 transition-colors cursor-pointer"
        >
          {inner}
        </Link>
      ) : (
        <div className="flex items-start bg-accent-charcoal rounded-lg px-4 py-3 pr-9">
          {inner}
        </div>
      )}
      <button
        onClick={() => onDismiss(notification.id)}
        className="absolute top-2.5 right-2.5 p-1 text-white/40 hover:text-white transition-colors"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={13} />
      </button>
    </div>
  );
}
