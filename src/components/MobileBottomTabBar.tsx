"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  InboxIcon,
  Book01Icon,
  AiChatIcon,
  LockPasswordIcon,
  MegaphoneIcon,
  MoreHorizontalCircle01Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";
import { useNotifications } from "@/src/context/NotificationContext";
import { useMobileChrome } from "@/src/context/MobileChromeContext";

type PrimaryTabId = "home" | "mail" | "kb" | "assistant";

const PRIMARY_TABS: {
  id: PrimaryTabId;
  label: string;
  href: string;
  icon: typeof Home01Icon;
}[] = [
  { id: "home", label: "Inicio", href: "/", icon: Home01Icon },
  { id: "mail", label: "Correo", href: "/emails", icon: InboxIcon },
  { id: "kb", label: "Docs", href: "/kb", icon: Book01Icon },
  { id: "assistant", label: "Asistente", href: "/assistant", icon: AiChatIcon },
];

const MORE_ITEMS = [
  { id: "vault", label: "Bóveda", href: "/boveda", icon: LockPasswordIcon },
  { id: "content", label: "Contenido", href: "/contenido", icon: MegaphoneIcon },
] as const;

function resolvePrimaryTab(pathname: string): PrimaryTabId | "more" | null {
  if (pathname.startsWith("/kb")) return "kb";
  if (pathname.startsWith("/emails") || pathname.startsWith("/campaigns")) return "mail";
  if (pathname.startsWith("/assistant")) return "assistant";
  if (pathname.startsWith("/boveda") || pathname.startsWith("/contenido")) return "more";
  if (
    pathname === "/" ||
    pathname.startsWith("/contacts") ||
    pathname.startsWith("/companies") ||
    pathname.startsWith("/pipeline") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/forms") ||
    pathname.startsWith("/cotizaciones") ||
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/appointment-types") ||
    pathname.startsWith("/availability") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile")
  ) {
    return "home";
  }
  return "home";
}

export default function MobileBottomTabBar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { notifications } = useNotifications();
  const { openMobileSidebar } = useMobileChrome();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const active = resolvePrimaryTab(pathname);
  const unreadEmailCount = notifications.filter((n) => n.type === "NEW_EMAIL" && !n.isRead).length;

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function handlePointer(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [moreOpen]);

  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] px-4 pb-3 lg:hidden crm-safe-bottom"
    >
      <div className="relative mx-auto w-full max-w-sm pointer-events-auto">
        {moreOpen && (
          <div className="absolute inset-x-0 bottom-full mb-2">
            <div
              ref={sheetRef}
              role="menu"
              className="crm-glass overflow-hidden rounded-[22px]"
            >
              {MORE_ITEMS.map((item) => {
                const isActive =
                  item.id === "vault"
                    ? pathname.startsWith("/boveda")
                    : pathname.startsWith("/contenido");
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      router.push(item.href);
                    }}
                    className={`flex w-full min-h-11 items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-nav-active text-action-primary"
                        : "text-text-primary hover:bg-nav-hover"
                    }`}
                  >
                    <HugeiconsIcon icon={item.icon} size={20} />
                    {item.label}
                  </button>
                );
              })}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoreOpen(false);
                  openMobileSidebar();
                }}
                className="flex w-full min-h-11 items-center gap-3 border-t border-black/[0.06] px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-nav-hover"
              >
                <HugeiconsIcon icon={Menu01Icon} size={20} />
                Menú lateral
              </button>
            </div>
          </div>
        )}

        <div className="crm-glass rounded-full border border-white/40 px-1.5 py-1.5 shadow-[0_8px_32px_rgba(11,11,24,0.12)]">
          <ul className="flex items-stretch justify-between gap-0.5">
            {PRIMARY_TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <li key={tab.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => router.push(tab.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex w-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1 text-[10px] font-semibold transition-colors ${
                      isActive
                        ? "bg-white/70 text-action-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <span className="relative">
                      <HugeiconsIcon icon={tab.icon} size={20} />
                      {tab.id === "mail" && unreadEmailCount > 0 && (
                        <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                          {unreadEmailCount > 99 ? "99+" : unreadEmailCount}
                        </span>
                      )}
                    </span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                </li>
              );
            })}
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={`flex w-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1 text-[10px] font-semibold transition-colors ${
                  active === "more" || moreOpen
                    ? "bg-white/70 text-action-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <HugeiconsIcon icon={MoreHorizontalCircle01Icon} size={20} />
                <span>Más</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
