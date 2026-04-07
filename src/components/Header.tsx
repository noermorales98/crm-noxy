"use client";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useHeader } from "@/src/context/HeaderContext";
import { useNotifications, type AppNotification, type NotificationType } from "@/src/context/NotificationContext";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
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
} from "@hugeicons/core-free-icons";

// ── Icon map per notification type ───────────────────────────────────────────

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  NEW_EMAIL: InboxIcon,
  NEW_CONTACT: UserMultipleIcon,
  NEW_FORM_LEAD: BrowserIcon,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  NEW_EMAIL: "bg-blue-50 text-blue-600",
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
  const { config, searchQuery, setSearchQuery, sortField, sortOrder, setSort, activeFilters, setFilter } = useHeader();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

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
    <header className="h-16 px-6 flex items-center justify-between border-b border-gray-100 bg-white flex-shrink-0">

      {/* Search */}
      <div className="flex-1 max-w-xs">
        <div className="relative flex items-center w-full h-9 rounded-xl bg-gray-50 border border-gray-100 px-3 focus-within:border-gray-300 focus-within:bg-white transition-all">
          <HugeiconsIcon icon={Search01Icon} size={15} color="#9ca3af" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={config.searchPlaceholder || "Buscar..."}
            className="flex-1 ml-2 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="ml-1 text-gray-400 hover:text-gray-600">
              <HugeiconsIcon icon={Cancel01Icon} size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">

        {/* Sort */}
        {hasSortOptions && (
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => { setSortOpen(!sortOpen); setFiltersOpen(false); setNotifOpen(false); }}
              className={`flex items-center gap-1.5 text-sm font-medium transition-all px-3 py-2 rounded-xl ${
                sortField
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <HugeiconsIcon icon={ArrowUpDownIcon} size={14} />
              {currentSortLabel ? (
                <span className="flex items-center gap-1">
                  {currentSortLabel}
                  <HugeiconsIcon icon={sortOrder === "asc" ? ArrowUp01Icon : ArrowDown01Icon} size={11} />
                </span>
              ) : "Ordenar"}
            </button>

            {sortOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 z-40">
                {config.sortOptions!.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setSortOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                      sortField === opt.value ? "text-gray-900 font-semibold bg-gray-50" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                    {sortField === opt.value && (
                      <HugeiconsIcon icon={sortOrder === "asc" ? ArrowUp01Icon : ArrowDown01Icon} size={13} color="#6b7280" />
                    )}
                  </button>
                ))}
                {sortField && (
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => { setSort(""); setSortOpen(false); }}
                      className="w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 text-left"
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
              className={`flex items-center gap-1.5 text-sm font-medium transition-all px-3 py-2 rounded-xl ${
                activeFilterCount > 0
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <HugeiconsIcon icon={SlidersHorizontalIcon} size={14} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-gray-900 text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filtersOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 z-40 flex flex-col gap-4">
                {config.filterGroups!.map((group) => (
                  <div key={group.key}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{group.label}</p>
                    <select
                      value={activeFilters[group.key] || ""}
                      onChange={(e) => setFilter(group.key, e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-gray-400"
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
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} color="white" />
            {config.addButton.label}
          </button>
        )}

        {/* ── Notification Bell ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); setSortOpen(false); setFiltersOpen(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors border border-gray-200"
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
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Notificaciones</p>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
                    Marcar todas
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <HugeiconsIcon icon={Notification01Icon} size={28} color="#d1d5db" />
                    <p className="text-sm mt-2">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={(id) => { markAsRead(id); }}
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
            className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center text-white font-semibold text-xs hover:bg-black transition-colors"
            title={session?.user?.name || "Usuario"}
          >
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name || "Usuario"}</p>
                <p className="text-xs text-gray-400 truncate">{session?.user?.email || ""}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <HugeiconsIcon icon={UserMultipleIcon} size={15} color="#9ca3af" />
                Mi perfil
              </Link>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <HugeiconsIcon icon={Settings01Icon} size={15} color="#9ca3af" />
                Configuración
              </Link>
              <div className="border-t border-gray-100 mt-1 pt-1">
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

    </header>
  );
}

// ── Notification item in dropdown ─────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
  onClose,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const Icon = TYPE_ICONS[notification.type] ?? Notification01Icon;
  const colorClass = TYPE_COLORS[notification.type] ?? "bg-gray-50 text-gray-500";

  const handleClick = () => {
    if (!notification.isRead) onRead(notification.id);
    onClose();
  };

  const content = (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 cursor-pointer ${
        !notification.isRead ? "bg-blue-50/40" : ""
      }`}
      onClick={handleClick}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
        <HugeiconsIcon icon={Icon} size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${!notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[10px] text-gray-300 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.isRead && (
        <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
      )}
    </div>
  );

  if (notification.link) {
    return <Link href={notification.link}>{content}</Link>;
  }
  return content;
}
