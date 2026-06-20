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
import { sileo } from "sileo";

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

const POLL_INTERVAL = 30_000;

function displayNotificationToasts(
  notifications: AppNotification[],
  markAsRead: (id: string) => void
) {
  for (const n of notifications) {
    if (n.link) {
      sileo.action({
        title: n.title,
        description: n.body ?? undefined,
        position: "top-center",
        duration: 6000,
        button: {
          title: "Ver",
          onClick: () => {
            markAsRead(n.id);
            window.location.href = n.link!;
          },
        },
      });
    } else {
      sileo.info({
        title: n.title,
        description: n.body ?? undefined,
        position: "top-center",
        duration: 6000,
      });
    }
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const lastFetchAtRef = useRef<string | null>(null);
  const initialLoadDone = useRef(false);
  const hiddenQueueRef = useRef<AppNotification[]>([]);
  const markAsReadRef = useRef<(id: string) => void>(() => {});

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }, []);

  markAsReadRef.current = markAsRead;

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
          lastFetchAtRef.current = pollStart;

          if (initialLoadDone.current && incoming.length > 0) {
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n.id));
              const fresh = incoming.filter((n) => !existingIds.has(n.id));
              return [...fresh, ...prev].slice(0, 50);
            });

            if (typeof document !== "undefined" && document.visibilityState === "visible") {
              displayNotificationToasts(incoming, (id) => markAsReadRef.current(id));
            } else {
              hiddenQueueRef.current = [
                ...hiddenQueueRef.current,
                ...incoming,
              ].slice(-5);
            }
          }
        } else {
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

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications(false);
  }, [session, fetchNotifications]);

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
        if (hiddenQueueRef.current.length > 0) {
          displayNotificationToasts(hiddenQueueRef.current, (id) => markAsReadRef.current(id));
          hiddenQueueRef.current = [];
        }

        fetchNotifications(true);
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    if (document.visibilityState === "visible") start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session, fetchNotifications]);

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
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}
