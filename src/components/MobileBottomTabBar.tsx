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
} from "@hugeicons/core-free-icons";
import { useNotifications } from "@/src/context/NotificationContext";
import { useSession } from "next-auth/react";
import { hasPermission, SECTION_PERMISSION, type RoleName, type ModulePermissions } from "@/src/lib/permissions";

type SectionId = "home" | "mail" | "kb" | "assistant" | "vault" | "content";

const MAX_BAR_SECTIONS = 5;
const STORAGE_PREFIX = "crm-mobile-bottom-nav";
const DEFAULT_SECTION_IDS: SectionId[] = ["home", "mail", "kb", "assistant"];

const SECTIONS: {
  id: SectionId;
  label: string;
  shortLabel: string;
  href: string;
  icon: typeof Home01Icon;
}[] = [
  { id: "home", label: "Inicio", shortLabel: "Inicio", href: "/", icon: Home01Icon },
  { id: "mail", label: "Correo", shortLabel: "Correo", href: "/emails", icon: InboxIcon },
  { id: "kb", label: "Docs", shortLabel: "Docs", href: "/kb", icon: Book01Icon },
  { id: "assistant", label: "Asistente", shortLabel: "Asistente", href: "/assistant", icon: AiChatIcon },
  { id: "vault", label: "Bóveda", shortLabel: "Bóveda", href: "/boveda", icon: LockPasswordIcon },
  { id: "content", label: "Gestión de contenido", shortLabel: "Contenido", href: "/contenido/general", icon: MegaphoneIcon },
];

const SECTION_IDS = SECTIONS.map((section) => section.id);

function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && SECTION_IDS.includes(value as SectionId);
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readStoredSections(userId: string): SectionId[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [...DEFAULT_SECTION_IDS];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_SECTION_IDS];
    const unique = parsed.filter(isSectionId).filter((id, index, all) => all.indexOf(id) === index);
    return unique.slice(0, MAX_BAR_SECTIONS);
  } catch {
    return [...DEFAULT_SECTION_IDS];
  }
}

function orderSections(ids: SectionId[]): SectionId[] {
  return SECTIONS.filter((section) => ids.includes(section.id)).map((section) => section.id);
}

function resolveSection(pathname: string): SectionId {
  if (pathname.startsWith("/kb")) return "kb";
  if (pathname.startsWith("/emails") || pathname.startsWith("/campaigns")) return "mail";
  if (pathname.startsWith("/assistant")) return "assistant";
  if (pathname.startsWith("/boveda")) return "vault";
  if (pathname.startsWith("/contenido")) return "content";
  return "home";
}

export default function MobileBottomTabBar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { data: session } = useSession();
  const { notifications } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<SectionId[]>(DEFAULT_SECTION_IDS);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const activeSection = resolveSection(pathname);
  const unreadEmailCount = notifications.filter((n) => n.type === "NEW_EMAIL" && !n.isRead).length;
  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const userId = session?.user?.id;

  const visibleSections = SECTIONS.filter((section) =>
    hasPermission(role, permissions, SECTION_PERMISSION[section.id]),
  );
  const visibleIds = new Set(visibleSections.map((section) => section.id));
  const barSections = SECTIONS.filter(
    (section) => selectedIds.includes(section.id) && visibleIds.has(section.id),
  );
  const barHasActive = barSections.some((section) => section.id === activeSection);

  useEffect(() => {
    if (!userId || hydratedUserId === userId) return;
    setSelectedIds(readStoredSections(userId));
    setHydratedUserId(userId);
  }, [hydratedUserId, userId]);

  useEffect(() => {
    if (!userId || hydratedUserId !== userId) return;
    localStorage.setItem(storageKey(userId), JSON.stringify(orderSections(selectedIds)));
  }, [hydratedUserId, selectedIds, userId]);

  useEffect(() => {
    setMoreOpen(false);
    setEditing(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function handlePointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
        setEditing(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [moreOpen]);

  if (pathname.startsWith("/assistant")) return null;

  function toggleSection(id: SectionId) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.filter((item) => visibleIds.has(item)).length >= MAX_BAR_SECTIONS) return current;
      return orderSections([...current, id]);
    });
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] px-4 pb-5 lg:hidden"
    >
      <div ref={rootRef} className="relative mx-auto w-full max-w-sm pointer-events-auto">
        {moreOpen && (
          <div className="absolute inset-x-0 bottom-full mb-2">
            <div
              role={editing ? "dialog" : "menu"}
              aria-label={editing ? "Editar barra" : "Todas las secciones"}
              className="crm-glass-pill overflow-hidden rounded-[22px]"
            >
              {editing ? (
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-text-primary">Editar barra</p>
                  <p className="mt-0.5 text-xs text-text-secondary">Elige hasta {MAX_BAR_SECTIONS} secciones.</p>
                  <ul className="mt-2 flex flex-col">
                    {visibleSections.map((section) => {
                      const checked = selectedIds.includes(section.id);
                      const atLimit = barSections.length >= MAX_BAR_SECTIONS;
                      const disabled = !checked && atLimit;
                      return (
                        <li key={section.id}>
                          <label
                            className={`flex min-h-11 items-center gap-3 py-2 text-sm font-medium ${
                              disabled ? "text-text-secondary" : "text-text-primary"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleSection(section.id)}
                              className="size-4 accent-action-primary"
                            />
                            <HugeiconsIcon icon={section.icon} size={20} />
                            {section.label}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="mt-1 flex min-h-11 w-full items-center justify-center rounded-full bg-action-primary text-sm font-semibold text-action-primary-foreground"
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <>
                  {visibleSections.map((section) => {
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoreOpen(false);
                          router.push(section.href);
                        }}
                        className={`flex w-full min-h-11 items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-nav-active text-action-primary"
                            : "text-text-primary hover:bg-nav-hover"
                        }`}
                      >
                        <HugeiconsIcon icon={section.icon} size={20} />
                        {section.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setEditing(true)}
                    className="flex w-full min-h-11 items-center gap-3 border-t border-black/[0.06] px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-nav-hover"
                  >
                    Editar barra
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="crm-glass-pill rounded-full px-1.5 py-1.5">
          <ul className="flex items-stretch justify-between gap-0.5">
            {barSections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <li key={section.id} className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => router.push(section.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex w-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1 text-[10px] font-semibold transition-colors ${
                      isActive
                        ? "bg-white/80 text-action-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <span className="relative">
                      <HugeiconsIcon icon={section.icon} size={20} />
                      {section.id === "mail" && unreadEmailCount > 0 && (
                        <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                          {unreadEmailCount > 99 ? "99+" : unreadEmailCount}
                        </span>
                      )}
                    </span>
                    <span className="max-w-full truncate">{section.shortLabel}</span>
                  </button>
                </li>
              );
            })}
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setMoreOpen((open) => !open);
                }}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={`flex w-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1 text-[10px] font-semibold transition-colors ${
                  !barHasActive || moreOpen
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
