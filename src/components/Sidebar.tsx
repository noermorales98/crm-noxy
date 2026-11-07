"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Building04Icon,
  UserMultipleIcon,
  Task01Icon,
  InboxIcon,
  BrowserIcon,
  Calendar01Icon,
  Clock01Icon,
  CalendarCheckIn01Icon,
  Add01Icon,
  BarChartIcon,
  FolderKanbanIcon,
  Book01Icon,
  Archive01Icon,
  SentIcon,
  SpamIcon,
  PencilEdit01Icon,
  Settings01Icon,
  AiChatIcon,
  Invoice01Icon,
  Search01Icon,
  Notification01Icon,
  Logout01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Delete01Icon,
  LockPasswordIcon,
  MegaphoneIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { useNotifications, type AppNotification, type NotificationType } from "@/src/context/NotificationContext";
import { useGlobalSearch } from "@/src/context/SearchContext";
import { useOptionalEmailContext } from "@/src/context/EmailContext";
import KbSidebarTree from "@/src/components/kb/KbSidebarTree";
import ContentMiniMonth from "@/src/components/content/ContentMiniMonth";
import VaultNav from "@/src/components/vault/VaultNav";
import { useAssistantConversations } from "@/src/components/useAssistantConversations";
import { play } from "cuelume";
import {
  canManageTeam,
  hasPermission,
  type ModulePermissions,
  type RoleName,
} from "@/src/lib/permissions";
import { userAvatarSrc } from "@/src/lib/user-sexo";
import {
  AREA_SECTIONS,
  NAV_ITEM_ACTIVE,
  activeFlatEntry,
  activeNavHref,
  contextualSectionFor,
  contextualSectionLabel,
  sidebarView,
  visibleAreaItems,
  visibleNavGroups,
  type AreaSection,
  type ContextualSection,
  type NavItem,
} from "@/src/lib/crm-navigation";

// ─── Noxy product design tokens (marco claro) ──────────────────────────────────

const ICON_SIZE = 16;

const itemBase =
  "relative flex min-h-11 items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors duration-200 motion-reduce:transition-none lg:min-h-10";
const itemIdle = "text-text-primary hover:bg-surface-elevated/60";

const sectionLabelClass = "px-3 pb-1.5 pt-5 text-xs font-semibold text-text-secondary";

interface SidebarProps {
  variant?: "docked" | "floating" | "pinned";
  onNavigate?: () => void;
}

// ─── Notification helpers (mirrored from Header) ───────────────────────────────

const NOTIF_ICONS: Record<NotificationType, typeof UserMultipleIcon> = {
  NEW_EMAIL: InboxIcon,
  NEW_CONTACT: UserMultipleIcon,
  NEW_FORM_LEAD: BrowserIcon,
};

const NOTIF_COLORS: Record<NotificationType, string> = {
  NEW_EMAIL: "bg-nav-hover text-action-primary",
  NEW_CONTACT: "bg-green-50 text-green-600",
  NEW_FORM_LEAD: "bg-nav-active text-action-primary",
};

function timeAgo(date: string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function navItemClass(isActive: boolean, extra = "") {
  return `${itemBase} ${isActive ? NAV_ITEM_ACTIVE : itemIdle} ${extra}`.trim();
}

/** Icono de cada destino de la lista plana (el modelo de navegación no conoce React). */
const NAV_ICONS: Record<string, typeof Home01Icon> = {
  "/": Home01Icon,
  "/companies": Building04Icon,
  "/contacts": UserMultipleIcon,
  "/tasks": Task01Icon,
  "/projects": FolderKanbanIcon,
  "/pipeline": BarChartIcon,
  "/pipeline/clientes": UserMultipleIcon,
  "/forms": BrowserIcon,
  "/cotizaciones": Invoice01Icon,
  "/appointment-types": Calendar01Icon,
  "/availability": Clock01Icon,
  "/appointments": CalendarCheckIn01Icon,
  "/emails": InboxIcon,
  "/kb": Book01Icon,
  "/assistant": AiChatIcon,
  "/boveda": LockPasswordIcon,
  "/contenido/general": MegaphoneIcon,
};

// ─── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel }: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-brand-obsidian/35" />
      <div className="relative w-72 mx-4 rounded-surface border border-line bg-white p-6" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-text-primary mb-1">¿Eliminar página?</p>
        <p className="text-xs text-text-secondary mb-1 truncate font-medium">&quot;{name}&quot;</p>
        <p className="text-xs text-text-secondary mb-5">Las subpáginas se conservarán pero perderán su padre.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="min-h-11 flex-1 py-2 text-sm text-text-primary rounded-control hover:bg-surface-sidebar transition-colors duration-200 motion-reduce:transition-none">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared NavItem ────────────────────────────────────────────────────────────

function NavItem({ icon, label, href, badge, exact = false, onNavigate }: { icon: any; label: string; href: string; badge?: number; exact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`${navItemClass(isActive)} justify-between`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <HugeiconsIcon icon={icon} size={ICON_SIZE} />
        <span className="truncate">{label}</span>
      </div>
      {badge != null && badge > 0 && (
        <span className="shrink-0 rounded-full bg-surface-elevated px-1.5 py-0.5 text-xs font-semibold tabular-nums text-text-primary">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

/** Espacios que abren submenú con «Volver» (el Asistente tiene su propio chrome). */
const SUBMENU_SPACES = new Set<string>(["mail", "kb", "vault", "content"]);

// ─── Lista plana (marco claro) ─────────────────────────────────────────────────

function FlatNav({
  groups,
  unreadEmailCount,
  onChoose,
}: {
  groups: ReturnType<typeof visibleNavGroups>;
  unreadEmailCount: number;
  onChoose: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const activeHref = activeFlatEntry(pathname, groups);
  return (
    <nav aria-label="Destinos" className="px-3 pb-4">
      {groups.map((group, index) => (
        <div key={group.label}>
          {index > 0 && <p className={sectionLabelClass}>{group.label}</p>}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = item.href === activeHref;
              const isAreaEntry = item.kind === "area";
              // Áreas y espacios con submenú (spec ronda 2): Contactos, Ventas, Agenda, Correo, Docs, Bóveda, Contenido.
              const opensSubmenu = isAreaEntry || SUBMENU_SPACES.has(contextualSectionFor(item.href) ?? "");
              const badge = !isAreaEntry && item.badge === "unread-mail" ? unreadEmailCount : undefined;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onChoose}
                  aria-current={isActive ? "page" : undefined}
                  className={`${navItemClass(isActive)} justify-between`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <HugeiconsIcon icon={NAV_ICONS[item.href] ?? Home01Icon} size={ICON_SIZE} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {badge != null && badge > 0 && (
                    <span className="shrink-0 rounded-full bg-surface-elevated px-1.5 py-0.5 text-xs font-semibold tabular-nums text-text-primary">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  {/* El área abre su submenú: el chevron lo anuncia. */}
                  {opensSubmenu && (
                    <>
                      <span className="sr-only">, abre submenú</span>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="shrink-0 text-text-secondary" aria-hidden="true" />
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// ─── Submenú de un área (Contactos, Ventas, Agenda) ───────────────────────────

function AreaNav({ items, onChoose }: { items: NavItem[]; onChoose: () => void }) {
  const pathname = usePathname() ?? "/";
  const activeHref = activeNavHref(
    pathname,
    items.map((item) => item.href),
  );
  return (
    <nav aria-label="Destinos del área" className="flex flex-col gap-0.5 px-3 pb-4 pt-1">
      {items.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onChoose}
            aria-current={isActive ? "page" : undefined}
            className={navItemClass(isActive)}
          >
            <HugeiconsIcon icon={NAV_ICONS[item.href] ?? Home01Icon} size={ICON_SIZE} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Tab 2: Correos ────────────────────────────────────────────────────────────

type EmailCompany = { id: string; name: string; smtpHost: string | null; imapHost: string | null };

const EMAIL_FOLDERS = [
  { key: "inbox" as const, label: "Bandeja de entrada", icon: InboxIcon },
  { key: "sent" as const, label: "Enviados", icon: SentIcon },
  { key: "archived" as const, label: "Archivados", icon: Archive01Icon },
  { key: "spam" as const, label: "Spam", icon: SpamIcon },
];

const composeBtnClass = "w-full min-h-11 flex items-center justify-center gap-2 bg-action-primary text-action-primary-foreground py-2.5 px-3 rounded-control text-sm font-semibold hover:bg-action-secondary transition-colors duration-200 motion-reduce:transition-none";

function MailNav({ unreadCount, onNavigate }: { unreadCount: number; onNavigate?: () => void }) {
  const emailCtx = useOptionalEmailContext();
  const pathname = usePathname();
  const [companies, setCompanies] = useState<EmailCompany[]>([]);

  useEffect(() => {
    fetch("/api/companies")
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const withSmtp = data.filter(c => c.smtpHost).map(c => ({
            id: c.id, name: c.name, smtpHost: c.smtpHost, imapHost: c.imapHost ?? null,
          }));
          setCompanies(withSmtp);
          if (emailCtx?.setCompanies) emailCtx.setCompanies(withSmtp);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFolder: string = emailCtx?.folder ?? (
    pathname.includes("box=sent") ? "sent" :
    pathname.includes("box=archived") ? "archived" :
    pathname.includes("box=spam") ? "spam" : "inbox"
  );
  const selectedCompanyId = emailCtx?.selectedCompanyId ?? null;
  const isOnEmail = pathname.startsWith("/emails");

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-1 pb-2 shrink-0">
        {emailCtx?.onCompose ? (
          <button onClick={emailCtx.onCompose} className={composeBtnClass}>
            <HugeiconsIcon icon={PencilEdit01Icon} size={ICON_SIZE} />
            Redactar
          </button>
        ) : (
          <Link href="/emails" onClick={onNavigate} className={composeBtnClass}>
            <HugeiconsIcon icon={PencilEdit01Icon} size={ICON_SIZE} />
            Redactar
          </Link>
        )}
      </div>

      <div className="px-3 pb-2 shrink-0 flex flex-col gap-1">
        {EMAIL_FOLDERS.map((f) => {
          const isActive = activeFolder === f.key;
          const cls = navItemClass(isActive, "w-full text-left justify-between");
          const inner = (
            <>
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon icon={f.icon} size={ICON_SIZE} />
                <span>{f.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {f.key === "inbox" && unreadCount > 0 && (
                  <span className="text-xs bg-nav-hover text-text-primary px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
                )}
              </div>
            </>
          );
          return isOnEmail && emailCtx ? (
            <button key={f.key} onClick={() => { emailCtx.setFolder(f.key); onNavigate?.(); }} className={cls}>{inner}</button>
          ) : (
            <Link key={f.key} href={f.key === "inbox" ? "/emails" : `/emails?box=${f.key}`} onClick={onNavigate} className={cls}>{inner}</Link>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0">
        <p className={sectionLabelClass}>Cuentas</p>

        {isOnEmail && emailCtx ? (
          <button onClick={() => { emailCtx.setSelectedCompanyId(null); onNavigate?.(); }} className={navItemClass(selectedCompanyId === null, "w-full text-left justify-between")}>
            <div className="flex items-center gap-2.5">
              <HugeiconsIcon icon={Building04Icon} size={ICON_SIZE} />
              <span className="truncate">Todas</span>
            </div>
          </button>
        ) : (
          <Link href="/emails" onClick={onNavigate} className={navItemClass(false)}>
            <HugeiconsIcon icon={Building04Icon} size={ICON_SIZE} />
            <span className="truncate">Todas</span>
          </Link>
        )}

        <div className="flex flex-col gap-1 mt-1">
          {companies.map((company) => {
            const isSelected = selectedCompanyId === company.id;
            const inner = (
              <>
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="shrink-0">
                    {company.imapHost
                      ? <HugeiconsIcon icon={InboxIcon} size={14} className="text-success" />
                      : <HugeiconsIcon icon={SentIcon} size={14} className="text-text-secondary" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{company.name}</span>
                    {!company.imapHost && <span className="text-xs text-amber-600 font-medium">Sin IMAP</span>}
                  </div>
                </div>
              </>
            );
            return (
              <div key={company.id} className="group relative">
                {isOnEmail && emailCtx ? (
                  <button onClick={() => { emailCtx.setSelectedCompanyId(company.id); onNavigate?.(); }} className={navItemClass(isSelected, "w-full text-left pr-8 justify-between")}>{inner}</button>
                ) : (
                  <Link href={`/emails?company=${company.id}`} onClick={onNavigate} className={`${navItemClass(false)} pr-8`}>{inner}</Link>
                )}
                {isOnEmail && emailCtx?.onOpenConfig && (
                  <button
                    onClick={() => emailCtx.onOpenConfig(company)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-text-primary hover:bg-nav-active transition-opacity duration-200 rounded-md motion-reduce:transition-none"
                    title="Configurar SMTP / IMAP"
                  >
                    <HugeiconsIcon icon={Settings01Icon} size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {companies.length === 0 && (
          <p className="text-xs text-text-secondary px-3 py-2 italic">Sin cuentas configuradas</p>
        )}
      </div>

    </div>
  );
}

// ─── Tab 3: Knowledge Base ─────────────────────────────────────────────────────

function KbNav({ onNavigate }: { onNavigate?: () => void }) {
  return <KbSidebarTree onNavigate={onNavigate} />;
}

// ─── Tab 6: Gestión de contenido ───────────────────────────────────────────────

type ContentClientEntry = { id: string; name: string; kind: string; color: string };

function ContentNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [clients, setClients] = useState<ContentClientEntry[]>([]);

  useEffect(() => {
    fetch("/api/content/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (Array.isArray(data)) setClients(data.map((c) => ({ id: c.id, name: c.name, kind: c.kind, color: c.color || "#3545D6" })));
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="flex flex-col h-full py-1 pb-4">
      <div className="px-3 pt-1 pb-2 shrink-0">
        <Link
          href="/contenido?new=1"
          onClick={onNavigate}
          className="w-full min-h-11 flex items-center justify-center gap-2 bg-action-primary text-action-primary-foreground py-2.5 px-3 rounded-control text-sm font-semibold hover:bg-action-secondary transition-colors duration-200 motion-reduce:transition-none"
        >
          <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} />
          Nuevo cliente / marca
        </Link>
      </div>

      <div className="px-3 pb-2 shrink-0 flex flex-col gap-1">
        <NavItem href="/contenido/general" icon={Calendar01Icon} label="Calendario general" exact onNavigate={onNavigate} />
        <NavItem href="/contenido" icon={MegaphoneIcon} label="Todos los calendarios" exact onNavigate={onNavigate} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0">
        <p className={sectionLabelClass}>Clientes y marcas</p>
        <div className="flex flex-col gap-1">
          {clients.map((c) => {
            const isActive = pathname === `/contenido/${c.id}`;
            return (
              <Link key={c.id} href={`/contenido/${c.id}`} onClick={onNavigate} className={navItemClass(isActive, "justify-between")}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: c.color || "#3545D6" }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{c.name}</span>
                </div>
              </Link>
            );
          })}
          {clients.length === 0 && (
            <p className="text-xs text-text-secondary px-3 py-2 italic">Aún no hay clientes ni marcas</p>
          )}
        </div>
      </div>
      <Suspense fallback={null}>
        <ContentMiniMonth />
      </Suspense>
    </div>
  );
}

// ─── Tab 5: Asistente ─────────────────────────────────────────────────────────

interface AssistantNavProps {
  onSearchOpen: () => void;
}

function AssistantNav({ onSearchOpen }: AssistantNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    status: conversationStatus,
    conversations,
    hasSnapshot: hasConversationSnapshot,
    refresh: refreshConversations,
  } = useAssistantConversations(Boolean(session?.user));
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteConv = async (id: string) => {
    try {
      await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
      void refreshConversations();
      if (pathname === `/assistant/${id}`) {
        router.push("/assistant/new");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-1 pb-3 shrink-0 flex flex-col gap-1.5">
        <Link
          href="/assistant/new"
          prefetch
          className="w-full min-h-11 flex items-center justify-center gap-2 bg-action-primary text-action-primary-foreground py-2.5 px-3 rounded-control text-sm font-semibold hover:bg-action-secondary transition-colors duration-200 motion-reduce:transition-none"
        >
          <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} />
          Nueva conversación
        </Link>
        <button
          type="button"
          onClick={onSearchOpen}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-colors"
        >
          <HugeiconsIcon icon={Search01Icon} size={ICON_SIZE} className="text-text-secondary" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="text-xs font-mono bg-surface-sidebar border border-line px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      <div
        role="region"
        className="flex-1 overflow-y-auto px-3 pb-4 min-h-0"
        aria-label="Historial de conversaciones"
        aria-busy={conversationStatus === "loading" || conversationStatus === "refreshing"}
      >
        {conversationStatus === "loading" ? (
          <>
            <span role="status" className="sr-only">Cargando historial de conversaciones</span>
            <div className="flex flex-col gap-1" aria-hidden="true">
              {[1, 2, 3].map((row) => (
                <div key={row} className="h-8 rounded-lg bg-nav-hover animate-pulse" />
              ))}
            </div>
          </>
        ) : conversationStatus === "error" && !hasConversationSnapshot ? (
          <div className="px-1 py-2">
            <p role="status" className="text-xs text-text-secondary italic">No se pudo cargar el historial</p>
            <button
              type="button"
              onClick={() => void refreshConversations()}
              className="mt-2 text-xs font-medium text-text-primary hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : conversationStatus === "ready" && conversations.length === 0 ? (
          <p className="text-xs text-text-secondary px-1 py-2 italic">Sin conversaciones</p>
        ) : (
          <>
            {conversationStatus === "refreshing" && (
              <span role="status" className="sr-only">Actualizando historial de conversaciones</span>
            )}
            {conversationStatus === "error" && hasConversationSnapshot && (
              <p role="status" className="px-1 pb-1.5 text-xs text-text-secondary">
                No se pudo actualizar el historial. Se muestran los datos anteriores.
              </p>
            )}
            {conversations.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {conversations.map((conv) => {
                  const isActive = pathname === `/assistant/${conv.id}`;
                  return (
                    <div key={conv.id} className="group relative">
                      <Link
                        href={`/assistant/${conv.id}`}
                        className={`${navItemClass(isActive)} pr-8 w-full`}
                      >
                        <HugeiconsIcon icon={AiChatIcon} size={ICON_SIZE} className="shrink-0" />
                        <span className="truncate text-sm">{conv.title}</span>
                      </Link>
                      {deletingId === conv.id ? (
                        <div className="absolute inset-0 flex items-center justify-end gap-1 pr-1 bg-surface-elevated rounded-lg">
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs px-2 py-1 rounded hover:bg-nav-hover text-text-secondary transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => deleteConv(conv.id)}
                            className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(conv.id)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-nav-active rounded-md transition-all"
                          title="Eliminar conversación"
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={14} className="text-text-secondary" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────

export default function Sidebar({ variant = "docked", onNavigate }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const { data: session } = useSession();
  const { notifications, unreadCount: notifUnread, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const { openSearch } = useGlobalSearch();
  const [sidebarNotifOpen, setSidebarNotifOpen] = useState(false);
  const [sidebarUserOpen, setSidebarUserOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  const unreadEmailCount = notifications.filter(n => n.type === "NEW_EMAIL" && !n.isRead).length;
  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const navGroups = visibleNavGroups(role, permissions);
  // «Volver» guarda la ruta en la que se pulsó; elegir cualquier destino lo anula.
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);
  const view = sidebarView(pathname, dismissedPath);
  const viewSection: ContextualSection | null = view.mode === "contextual" ? view.section : null;
  // Un área sin destinos visibles para esta persona no abre un panel vacío: se queda la lista plana.
  const contextual: ContextualSection | null =
    viewSection && (AREA_SECTIONS as readonly string[]).includes(viewSection) && visibleAreaItems(viewSection as AreaSection, role, permissions).length === 0
      ? null
      : viewSection;
  const chooseDestination = () => {
    setDismissedPath(null);
    onNavigate?.();
  };
  const canSeeSettings = hasPermission(role, permissions, "settings");
  const showTeam = canManageTeam(role);

  const closeUserMenuForNavigation = () => {
    setSidebarUserOpen(false);
    onNavigate?.();
  };

  const handleSignOut = () => {
    onNavigate?.();
    void signOut();
  };

  // Close bottom dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setSidebarNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setSidebarUserOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Hover sound for sidebar nav links only (scoped to this container)
  useEffect(() => {
    const container = asideRef.current;
    if (!container) return;

    let lastLink: HTMLElement | null = null;

    function handlePointerOver(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const link = (e.target as HTMLElement).closest("a");
      if (link && link !== lastLink && container!.contains(link)) {
        lastLink = link;
        play("tick");
      } else if (!link) {
        lastLink = null;
      }
    }

    function handlePointerOut(e: PointerEvent) {
      const link = (e.target as HTMLElement).closest("a");
      if (link && link === lastLink) {
        const related = e.relatedTarget as HTMLElement | null;
        if (!related || !link.contains(related)) lastLink = null;
      }
    }

    container.addEventListener("pointerover", handlePointerOver);
    container.addEventListener("pointerout", handlePointerOut);
    return () => {
      container.removeEventListener("pointerover", handlePointerOver);
      container.removeEventListener("pointerout", handlePointerOut);
    };
  }, []);

  const onAssistantRoute = pathname === "/assistant" || pathname.startsWith("/assistant/");
  const shellClass =
    variant === "floating"
      ? "flex h-full w-full flex-col overflow-hidden rounded-surface border border-line bg-surface-sidebar"
      : variant === "pinned"
        ? "flex h-full w-full flex-col overflow-hidden border-r border-line bg-surface-sidebar"
        : "flex h-full w-64 shrink-0 flex-col overflow-hidden bg-surface-sidebar";
  const sectionPanel = (section: ContextualSection, layout = "flex h-full flex-col") =>
    contextual === section ? layout : "hidden";

  return (
    <>
      <aside ref={asideRef} aria-label="Barra lateral principal" className={shellClass}>
        <div className="flex h-14 shrink-0 items-center gap-2.5 px-5">
          {/* Isotipo oficial (public/Isotipo_Azul.svg), sin cuadro de fondo. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Isotipo_Azul.svg" alt="" width={20} height={15} className="h-[15px] w-5 shrink-0" />
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-text-primary">Noxy</span>
        </div>

        {contextual && (
          <div className="shrink-0 px-3 pb-1">
            <button
              type="button"
              data-nav-back
              onClick={() => setDismissedPath(pathname)}
              className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-sm font-medium text-text-secondary hover:bg-surface-elevated/60 hover:text-text-primary lg:min-h-10"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={ICON_SIZE} />
              Volver
            </button>
            <p className="px-3 pb-1 pt-2 text-base font-semibold text-text-primary">{contextualSectionLabel(contextual)}</p>
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <div className={contextual ? "hidden" : "block"}>
            <FlatNav groups={navGroups} unreadEmailCount={unreadEmailCount} onChoose={chooseDestination} />
          </div>
          {AREA_SECTIONS.map((section: AreaSection) => {
            const items = visibleAreaItems(section, role, permissions);
            if (items.length === 0) return null;
            return (
              <div key={section} className={sectionPanel(section)}>
                <AreaNav items={items} onChoose={chooseDestination} />
              </div>
            );
          })}
          {hasPermission(role, permissions, "mail") && (
            <div className={sectionPanel("mail")}>
              <MailNav unreadCount={unreadEmailCount} onNavigate={onNavigate} />
            </div>
          )}
          {hasPermission(role, permissions, "kb") && (
            <div className={sectionPanel("kb")}>
              <KbNav onNavigate={onNavigate} />
            </div>
          )}
          {hasPermission(role, permissions, "vault") && (
            <div className={sectionPanel("vault")}>
              <VaultNav onNavigate={onNavigate} />
            </div>
          )}
          {hasPermission(role, permissions, "assistant") && (
            <div className={sectionPanel("assistant")}>
              <AssistantNav onSearchOpen={openSearch} />
            </div>
          )}
          {hasPermission(role, permissions, "content") && (
            <div className={sectionPanel("content", "flex h-full min-h-0 flex-col overflow-hidden")}>
              <ContentNav onNavigate={onNavigate} />
            </div>
          )}
        </div>

        {/* ── Bottom bar (only on assistant tab) ─────────────────────────────── */}
        {onAssistantRoute && (
          <div className="shrink-0 border-t border-line px-3 py-3 flex items-center gap-1">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setSidebarNotifOpen(v => !v); setSidebarUserOpen(false); }}
                className="relative flex size-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-nav-hover hover:text-text-primary"
                title="Notificaciones"
              >
                <HugeiconsIcon icon={Notification01Icon} size={16} />
                {notifUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                    {notifUnread > 99 ? "99+" : notifUnread}
                  </span>
                )}
              </button>

              {sidebarNotifOpen && (
                <div className="crm-floating-menu absolute bottom-full left-0 mb-2 w-72 bg-surface-elevated rounded-lg overflow-hidden z-50 border border-line">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                    <p className="text-sm font-bold text-text-primary">Notificaciones</p>
                    <div className="flex items-center gap-2">
                      {notifUnread > 0 && (
                        <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
                          Leer todas
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button onClick={clearAll} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                          <HugeiconsIcon icon={Delete01Icon} size={12} />
                          Borrar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-line">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                        <HugeiconsIcon icon={Notification01Icon} size={22} className="text-text-secondary" />
                        <p className="text-xs mt-2">Sin notificaciones</p>
                      </div>
                    ) : (
                      notifications.map((n: AppNotification) => {
                        const Icon = NOTIF_ICONS[n.type] ?? Notification01Icon;
                        const colorClass = NOTIF_COLORS[n.type] ?? "bg-surface-sidebar text-text-secondary";
                        return (
                          <button
                            key={n.id}
                            onClick={() => { markAsRead(n.id); setSidebarNotifOpen(false); }}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-sidebar transition-colors ${!n.isRead ? "bg-nav-hover" : ""}`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                              <HugeiconsIcon icon={Icon} size={12} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-tight ${!n.isRead ? "font-semibold text-text-primary" : "text-text-primary"}`}>{n.title}</p>
                              {n.body && <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.body}</p>}
                              <p className="text-xs text-gray-300 mt-1">{timeAgo(n.createdAt)}</p>
                            </div>
                            {!n.isRead && <span className="w-1.5 h-1.5 bg-action-primary rounded-full shrink-0 mt-1.5" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative ml-auto" ref={userRef}>
              <button
                onClick={() => { setSidebarUserOpen(v => !v); setSidebarNotifOpen(false); }}
                className="size-8 overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                title={session?.user?.name || "Usuario"}
              >
                <img src={userAvatarSrc(session?.user?.sexo)} alt={session?.user?.name || "Usuario"} className="h-full w-full object-cover" />
              </button>

              {sidebarUserOpen && (
                <div className="crm-floating-menu absolute bottom-full right-0 z-[80] mb-2 w-52 rounded-lg border border-line bg-surface-elevated py-1">
                  <div className="px-4 py-3 border-b border-line">
                    <p className="text-sm font-semibold text-text-primary truncate">{session?.user?.name || "Usuario"}</p>
                    <p className="text-xs text-text-secondary truncate">{session?.user?.email || ""}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={closeUserMenuForNavigation}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                  >
                    <HugeiconsIcon icon={UserMultipleIcon} size={14} className="text-text-secondary" />
                    Mi perfil
                  </Link>
                  {showTeam && (
                    <Link
                      href="/settings/equipo"
                      onClick={closeUserMenuForNavigation}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                    >
                      <HugeiconsIcon icon={UserMultipleIcon} size={14} className="text-text-secondary" />
                      Equipo
                    </Link>
                  )}
                  {canSeeSettings && (
                    <>
                      <Link
                        href="/settings"
                        onClick={closeUserMenuForNavigation}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                      >
                        <HugeiconsIcon icon={Settings01Icon} size={14} className="text-text-secondary" />
                        Configuración
                      </Link>
                      <Link
                        href="/settings/digest"
                        onClick={closeUserMenuForNavigation}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                      >
                        <HugeiconsIcon icon={Notification01Icon} size={14} className="text-text-secondary" />
                        Resumen WhatsApp
                      </Link>
                      <Link
                        href="/settings/ai-models"
                        onClick={closeUserMenuForNavigation}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                      >
                        <HugeiconsIcon icon={AiChatIcon} size={14} className="text-text-secondary" />
                        Modelos de IA
                      </Link>
                    </>
                  )}
                  <div className="border-t border-line mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <HugeiconsIcon icon={Logout01Icon} size={14} className="text-danger" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
