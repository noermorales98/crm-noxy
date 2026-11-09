"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BrowserIcon,
  CheckmarkCircle01Icon,
  Delete01Icon,
  InboxIcon,
  Notification01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { useNotifications, type AppNotification, type NotificationType } from "@/src/context/NotificationContext";

const NOTIF_ICONS: Record<NotificationType, typeof UserMultipleIcon> = {
  NEW_EMAIL: InboxIcon,
  NEW_CONTACT: UserMultipleIcon,
  NEW_FORM_LEAD: BrowserIcon,
};

function timeAgo(date: string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

type NotificationsMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «below»: cabecera del sidebar expandida; «right»: riel de iconos (se abre hacia la hoja). */
  placement?: "below" | "right";
  /** Se llama al ir a la página de una notificación (cierra el cajón en móvil). */
  onNavigate?: () => void;
};

/**
 * Campana con contador y lista de notificaciones. Vive en la cabecera del sidebar (no hay barra superior).
 * Fuera cierra; Esc cierra y devuelve el foco a la campana.
 */
export default function NotificationsMenu({ open, onOpenChange, placement = "below", onNavigate }: NotificationsMenuProps) {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) onOpenChange(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onOpenChange(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onOpenChange]);

  const position = placement === "right" ? "left-full top-0 ml-2 origin-top-left" : "max-lg:fixed max-lg:inset-x-3 max-lg:top-16 max-lg:mt-0 max-lg:w-auto lg:left-0 lg:top-full lg:mt-2 origin-top-left";

  return (
    <div className="relative" ref={wrapRef} data-sidebar-notifications>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones"}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notificaciones"
        className="relative flex size-11 items-center justify-center rounded-control text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus"
      >
        <HugeiconsIcon icon={Notification01Icon} size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none tabular-nums text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className={`crm-floating-menu crm-menu-enter absolute z-[80] lg:w-72 overflow-hidden rounded-surface border border-line bg-surface-elevated ${position}`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <p className="text-sm font-semibold text-text-primary">Notificaciones</p>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead} className="flex min-h-11 items-center gap-1 px-1 text-xs text-text-secondary-strong hover:text-text-primary">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} aria-hidden="true" />
                  Leer todas
                </button>
              )}
              {notifications.length > 0 && (
                <button type="button" onClick={clearAll} className="flex min-h-11 items-center gap-1 px-1 text-xs text-danger hover:underline">
                  <HugeiconsIcon icon={Delete01Icon} size={12} aria-hidden="true" />
                  Borrar
                </button>
              )}
            </div>
          </div>
          <div className="max-h-72 divide-y divide-line overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-text-secondary">Sin notificaciones</p>
            ) : (
              notifications.map((n: AppNotification) => {
                const Icon = NOTIF_ICONS[n.type] ?? Notification01Icon;
                return (
                  <div key={n.id} className={`flex items-start transition-colors hover:bg-nav-hover ${!n.isRead ? "bg-nav-hover" : ""}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.isRead) markAsRead(n.id);
                        onOpenChange(false);
                        if (n.link) {
                          router.push(n.link);
                          onNavigate?.();
                        }
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3 py-3 pl-4 text-left"
                    >
                      <HugeiconsIcon icon={Icon} size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-text-secondary" />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs leading-tight text-text-primary ${!n.isRead ? "font-semibold" : ""}`}>{n.title}</span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-text-secondary">{n.body}</span>}
                        <span className="mt-1 block text-xs text-text-secondary">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.isRead && <span aria-label="Sin leer" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-action-primary" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      aria-label="Eliminar notificación"
                      title="Eliminar notificación"
                      className="flex size-11 shrink-0 items-center justify-center text-text-secondary hover:text-danger"
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={14} aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
