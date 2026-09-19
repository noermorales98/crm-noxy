"use client";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useHeader, type HeaderAction } from "@/src/context/HeaderContext";
import GlobalSearchTrigger from "@/src/components/GlobalSearchTrigger";
import MobileSidebarToggle from "@/src/components/MobileSidebarToggle";
import { useNotifications, type AppNotification, type NotificationType } from "@/src/context/NotificationContext";
import {
  canManageTeam,
  hasPermission,
  type ModulePermissions,
  type RoleName,
} from "@/src/lib/permissions";
import { userAvatarSrc } from "@/src/lib/user-sexo";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SlidersHorizontalIcon,
  ArrowUpDownIcon,
  Add01Icon,
  Settings01Icon,
  Logout01Icon,
  UserMultipleIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  Notification01Icon,
  InboxIcon,
  BrowserIcon,
  CheckmarkCircle01Icon,
  Delete01Icon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";

// ── Icon map per notification type ───────────────────────────────────────────

const TYPE_ICONS: Record<NotificationType, any> = {
  NEW_EMAIL: InboxIcon,
  NEW_CONTACT: UserMultipleIcon,
  NEW_FORM_LEAD: BrowserIcon,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  NEW_EMAIL: "bg-nav-hover text-action-primary",
  NEW_CONTACT: "bg-green-50 text-green-600",
  NEW_FORM_LEAD: "bg-violet-50 text-violet-600",
};

function timeAgo(date: string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Header() {
  const { data: session } = useSession();
  const { config, sortField, sortOrder, setSort, activeFilters, setFilter } = useHeader();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFiltersOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasSortOptions = config.sortOptions && config.sortOptions.length > 0;
  const hasFilterGroups = config.filterGroups && config.filterGroups.length > 0;
  const activeFilterCount = Object.keys(activeFilters).length;
  const currentSortLabel = config.sortOptions?.find((o) => o.value === sortField)?.label;

  return (
    <header className="crm-header-chrome crm-safe-top sticky top-0 z-40 shrink-0 lg:static lg:z-auto">
      <div className="relative flex h-14 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">

      {/* Page title */}
      <div className="flex min-w-0 items-center gap-2">
        <MobileSidebarToggle />
        {config.backHref && (
          <Link
            href={config.backHref}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-nav-hover hover:text-text-primary transition-colors"
            title="Regresar"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Link>
        )}
        {config.title && (
          <>
            <h1 className="truncate text-base font-bold text-text-primary sm:text-lg">{config.title}</h1>
            {(config.titleBadge || config.titleBadge === 0) && (
              <span className="px-2 py-0.5 bg-gray-100 text-text-secondary text-xs font-semibold rounded-full shrink-0">
                {config.titleBadge}
              </span>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">

        {/* Sort */}
        {hasSortOptions && (
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => { setSortOpen(!sortOpen); setFiltersOpen(false); setNotifOpen(false); }}
              className={`flex size-8 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 ${
                sortField
                  ? "bg-nav-active text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-nav-hover"
              }`}
            >
              <HugeiconsIcon icon={ArrowUpDownIcon} size={14} />
              {currentSortLabel ? (
                <span className="hidden items-center gap-1 sm:flex">
                  {currentSortLabel}
                  <HugeiconsIcon icon={sortOrder === "asc" ? ArrowUp01Icon : ArrowDown01Icon} size={11} />
                </span>
              ) : (
                <span className="hidden sm:inline">Ordenar</span>
              )}
            </button>

            {sortOpen && (
              <div className="crm-floating-menu absolute left-0 z-[80] mt-2 w-48 rounded-lg bg-surface-elevated py-1">
                {config.sortOptions!.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setSortOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                      sortField === opt.value ? "text-text-primary font-semibold bg-surface-sidebar" : "text-text-secondary hover:bg-surface-sidebar"
                    }`}
                  >
                    {opt.label}
                    {sortField === opt.value && (
                      <HugeiconsIcon icon={sortOrder === "asc" ? ArrowUp01Icon : ArrowDown01Icon} size={13} color="#6b7280" />
                    )}
                  </button>
                ))}
                {sortField && (
                  <div className="border-t border-border-subtle mt-1 pt-1">
                    <button
                      onClick={() => { setSort(""); setSortOpen(false); }}
                      className="w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-sidebar text-left"
                    >
                      Quitar orden
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {hasFilterGroups && (
          <div className="relative" ref={filtersRef}>
            <button
              onClick={() => { setFiltersOpen(!filtersOpen); setSortOpen(false); setNotifOpen(false); }}
              className={`flex size-8 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 ${
                activeFilterCount > 0
                  ? "bg-nav-active text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-nav-hover"
              }`}
            >
              <HugeiconsIcon icon={SlidersHorizontalIcon} size={14} />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-text-primary text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filtersOpen && (
              <div className="crm-floating-menu absolute left-0 z-[80] mt-2 flex w-56 flex-col gap-4 rounded-lg bg-surface-elevated p-4">
                {config.filterGroups!.map((group) => (
                  <div key={group.key}>
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-2">{group.label}</p>
                    <select
                      value={activeFilters[group.key] || ""}
                      onChange={(e) => setFilter(group.key, e.target.value)}
                      className="w-full text-sm rounded-lg px-3 py-1.5 bg-surface-sidebar focus:outline-none focus:bg-surface-elevated"
                    >
                      <option value="">Todos</option>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { config.filterGroups!.forEach((g) => setFilter(g.key, "")); }}
                    className="text-sm text-red-500 hover:text-red-700 text-left"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add Button */}
        {config.addButton && (
          <button
            onClick={config.addButton.onClick}
            className="flex size-8 items-center justify-center gap-1.5 rounded-lg bg-action-primary text-sm font-medium text-action-primary-foreground transition-opacity hover:opacity-90 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} color="white" />
            <span className="hidden sm:inline">{config.addButton.label}</span>
          </button>
        )}

        {/* Custom icon actions */}
        {config.actions?.map((action) => (
          <HeaderActionButton key={action.key} action={action} />
        ))}

        {/* Global search */}
        <GlobalSearchTrigger compact className="w-64 max-xl:w-40 max-sm:w-9 max-sm:px-2.5" />

        {/* ── Notification Bell ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); setSortOpen(false); setFiltersOpen(false); }}
            className="relative flex size-8 items-center justify-center rounded-lg bg-white/80 text-text-secondary transition-colors hover:bg-nav-hover hover:text-text-primary"
            title="Notificaciones"
          >
            <HugeiconsIcon icon={Notification01Icon} size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="crm-floating-menu absolute right-0 z-[80] mt-2 w-80 overflow-hidden rounded-lg bg-surface-elevated">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <p className="text-sm font-bold text-text-primary">Notificaciones</p>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
                      Leer todas
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={13} />
                      Borrar todas
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-border-subtle">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-text-secondary">
                    <HugeiconsIcon icon={Notification01Icon} size={28} color="#d1d5db" />
                    <p className="text-sm mt-2">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={(id) => { markAsRead(id); }}
                      onDelete={(id) => { deleteNotification(id); }}
                      onClose={() => setNotifOpen(false)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
            className="size-8 overflow-hidden rounded-lg transition-opacity hover:opacity-90"
            title={session?.user?.name || "Usuario"}
          >
            <img src={userAvatarSrc(session?.user?.sexo)} alt={session?.user?.name || "Usuario"} className="h-full w-full object-cover" />
          </button>

          {userMenuOpen && (
            <div className="crm-floating-menu absolute right-0 z-[80] mt-2 w-52 rounded-lg bg-surface-elevated py-1">
              <div className="px-4 py-3 border-b border-border-subtle">
                <p className="text-sm font-semibold text-text-primary truncate">{session?.user?.name || "Usuario"}</p>
                <p className="text-xs text-text-secondary truncate">{session?.user?.email || ""}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
              >
                <HugeiconsIcon icon={UserMultipleIcon} size={15} color="#9ca3af" />
                Mi perfil
              </Link>
              {canManageTeam(session?.role as RoleName | undefined) && (
                <Link
                  href="/settings/equipo"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                >
                  <HugeiconsIcon icon={UserMultipleIcon} size={15} color="#9ca3af" />
                  Equipo
                </Link>
              )}
              {hasPermission(session?.role as RoleName | undefined, session?.permissions as ModulePermissions | undefined, "settings") && (
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                >
                  <HugeiconsIcon icon={Settings01Icon} size={15} color="#9ca3af" />
                  Configuración
                </Link>
              )}
              <div className="border-t border-border-subtle mt-1 pt-1">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <HugeiconsIcon icon={Logout01Icon} size={15} color="#ef4444" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      </div>
    </header>
  );
}

// ── Custom icon action button (optionally with a dropdown menu) ───────────────

function HeaderActionButton({ action }: { action: HeaderAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const buttonClass = `relative flex size-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
    action.active
      ? "bg-action-primary text-action-primary-foreground hover:opacity-90"
      : "bg-white/80 text-text-secondary hover:text-text-primary hover:bg-nav-hover"
  }`;
  const icon = <HugeiconsIcon icon={action.icon} size={16} className={action.spinning ? "animate-spin" : ""} />;

  if (action.menu?.length) {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={action.disabled}
          className={buttonClass}
          title={action.label}
        >
          {icon}
        </button>
        {open && (
          <div className="crm-floating-menu absolute right-0 z-[80] mt-2 w-56 rounded-lg bg-surface-elevated py-1">
            {action.menu.map((item) => (
              <button
                key={item.label}
                onClick={() => { item.onClick(); setOpen(false); }}
                className="w-full px-4 py-2.5 text-sm text-left text-text-secondary hover:bg-surface-sidebar hover:text-text-primary transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (action.href) {
    return (
      <Link href={action.href} className={buttonClass} title={action.label}>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} className={buttonClass} title={action.label}>
      {icon}
    </button>
  );
}

// ── Notification item in dropdown ─────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
  onDelete,
  onClose,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const Icon = TYPE_ICONS[notification.type] ?? Notification01Icon;
  const colorClass = TYPE_COLORS[notification.type] ?? "bg-surface-sidebar text-text-secondary";

  const handleClick = () => {
    if (!notification.isRead) onRead(notification.id);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(notification.id);
  };

  const content = (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-sidebar cursor-pointer group relative ${
        !notification.isRead ? "bg-nav-hover" : ""
      }`}
      onClick={handleClick}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
        <HugeiconsIcon icon={Icon} size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${!notification.isRead ? "font-semibold text-text-primary" : "font-medium text-text-primary"}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[10px] text-gray-300 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-1">
        {!notification.isRead && (
          <span className="w-2 h-2 bg-action-primary rounded-full" />
        )}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
          title="Eliminar notificación"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} />
        </button>
      </div>
    </div>
  );

  if (notification.link) {
    return <Link href={notification.link}>{content}</Link>;
  }
  return content;
}
