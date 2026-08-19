"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
} from "@hugeicons/core-free-icons";
import { useNotifications, type AppNotification, type NotificationType } from "@/src/context/NotificationContext";
import { useGlobalSearch } from "@/src/context/SearchContext";
import { useOptionalEmailContext } from "@/src/context/EmailContext";
import KbSidebarTree from "@/src/components/kb/KbSidebarTree";
import VaultNav from "@/src/components/vault/VaultNav";
import { useAssistantConversations } from "@/src/components/useAssistantConversations";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { play } from "cuelume";

type SidebarTab = "home" | "mail" | "kb" | "assistant" | "vault" | "content";

// ─── Noxy product design tokens ────────────────────────────────────────────────

const ICON_COLOR = "#0B0B18";
const SIDEBAR_W = "w-64";
const ICON_SIZE = 16;

const itemBase = "flex min-h-10 items-center gap-2.5 px-3 py-2 rounded-control text-sm transition-colors duration-200 motion-reduce:transition-none";
const itemActive = "bg-nav-active text-text-primary font-medium";
const itemHover = "hover:bg-nav-hover";
const itemIdle = "text-text-primary";

const sectionLabelClass = "px-3 pt-6 pb-2 text-xs font-semibold text-text-secondary-strong";

interface SidebarProps {
  variant?: "docked" | "floating";
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
  return `${itemBase} ${isActive ? itemActive : `${itemIdle} ${itemHover}`} ${extra}`.trim();
}

const SECTIONS: {
  id: SidebarTab;
  label: string;
  href: string;
  icon: typeof Home01Icon;
  accent: string;
  accentBg: string;
}[] = [
  { id: "home", label: "Inicio", href: "/", icon: Home01Icon, accent: "#3545D6", accentBg: "#EBEDFA" },
  { id: "mail", label: "Correo", href: "/emails", icon: InboxIcon, accent: "#5363EE", accentBg: "#EBEDFA" },
  { id: "kb", label: "Docs", href: "/kb", icon: Book01Icon, accent: "#3545D6", accentBg: "#DDE3FE" },
  { id: "assistant", label: "Asistente", href: "/assistant", icon: AiChatIcon, accent: "#3545D6", accentBg: "#EBEDFA" },
  { id: "vault", label: "Bóveda", href: "/boveda", icon: LockPasswordIcon, accent: "#0B0B18", accentBg: "#C8FE37" },
  { id: "content", label: "Gestión de contenido", href: "/contenido", icon: MegaphoneIcon, accent: "#5363EE", accentBg: "#EBEDFA" },
];

// ─── Section switcher (unified dropdown) ───────────────────────────────────────

function SectionLogoMark({
  icon,
  accent,
  accentBg,
  size = 20,
}: {
  icon: typeof Home01Icon;
  accent: string;
  accentBg: string;
  size?: number;
}) {
  return (
    <span
      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: accentBg }}
    >
      <HugeiconsIcon icon={icon} size={size} color={accent} />
    </span>
  );
}

function SectionSwitcher({
  activeTab,
  onChange,
  unreadCount,
  onNavigate,
}: {
  activeTab: SidebarTab;
  onChange: (tab: SidebarTab) => void;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SECTIONS.find((s) => s.id === activeTab)!;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const selectSection = (section: (typeof SECTIONS)[number]) => {
    onChange(section.id);
    onNavigate?.();
    router.push(section.href);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative px-3 pt-5 pb-3 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors hover:bg-nav-hover group"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <SectionLogoMark icon={current.icon} accent={current.accent} accentBg={current.accentBg} />
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-[15px] font-semibold text-text-primary leading-tight truncate tracking-tight">
            {current.label}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="crm-floating-menu absolute left-3 right-3 top-full mt-1 z-50 bg-surface-elevated rounded-lg py-1.5 overflow-hidden border border-border-subtle"
          role="listbox"
        >
          {SECTIONS.map((section) => {
            const isActive = section.id === activeTab;
            return (
              <button
                key={section.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => selectSection(section)}
                className={`w-full flex items-center gap-3 px-2.5 py-2.5 text-sm transition-colors ${
                  isActive ? "bg-nav-active" : "hover:bg-nav-hover"
                }`}
              >
                <SectionLogoMark icon={section.icon} accent={section.accent} accentBg={section.accentBg} size={18} />
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-sm font-semibold text-text-primary leading-tight">{section.label}</span>
                  <span className="block text-[10px] text-text-secondary mt-0.5">
                    {section.id === "home" && "Dashboard y proyectos"}
                    {section.id === "mail" && "Bandeja y campañas"}
                    {section.id === "kb" && "Documentación interna"}
                    {section.id === "assistant" && "Asistente de IA"}
                    {section.id === "vault" && "Contraseñas de clientes"}
                    {section.id === "content" && "Calendarios por marca"}
                  </span>
                </span>
                {section.id === "mail" && unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-nav-hover text-text-primary shrink-0">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {isActive && <Check size={14} className="shrink-0 text-text-primary" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel }: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-brand-obsidian/35" />
      <div className="relative w-72 mx-4 rounded-surface border border-border-subtle bg-white p-6" onClick={e => e.stopPropagation()}>
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

function NavItem({ icon, label, href, badge }: { icon: any; label: string; href: string; badge?: number }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link href={href} className={`${navItemClass(isActive)} justify-between`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <HugeiconsIcon icon={icon} size={ICON_SIZE} color={ICON_COLOR} />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {badge != null && badge > 0 && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-nav-hover text-text-primary">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {isActive && <Check size={13} className="text-text-secondary" strokeWidth={2.5} />}
      </div>
    </Link>
  );
}

// ─── Expandable nav group (parent toggles a submenu of child links) ───────────

function NavGroup({
  icon,
  label,
  items,
}: {
  icon: any;
  label: string;
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  // Pick the most specific (longest) matching href, since sibling routes can share a prefix
  // (e.g. "/pipeline" and "/pipeline/clientes" would otherwise both match "/pipeline/clientes").
  const activeHref = items
    .filter((c) => pathname === c.href || pathname.startsWith(c.href + "/"))
    .reduce<string | null>((best, c) => (best === null || c.href.length > best.length ? c.href : best), null);
  const isChildActive = activeHref !== null;
  const [expanded, setExpanded] = useState(isChildActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`${navItemClass(isChildActive && !expanded)} w-full justify-between`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <HugeiconsIcon icon={icon} size={ICON_SIZE} color={ICON_COLOR} />
          <span className="truncate">{label}</span>
        </div>
        <ChevronRight
          size={13}
          className={`text-text-secondary shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 mt-1 pl-4 border-l border-border-subtle ml-4">
          {items.map((child) => {
            const isActive = child.href === activeHref;
            return (
              <Link key={child.href} href={child.href} className={`${navItemClass(isActive)} justify-between`}>
                <span className="truncate">{child.label}</span>
                {isActive && <Check size={13} className="text-text-secondary shrink-0" strokeWidth={2.5} />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <p className={sectionLabelClass}>{label}</p>;
}

// ─── Tab 1: Inicio ─────────────────────────────────────────────────────────────

function HomeNav() {
  return (
    <div className="py-1 pb-4">
      <div className="px-3 flex flex-col gap-1">
        <NavItem href="/" icon={Home01Icon} label="Inicio" />
        <NavItem href="/companies" icon={Building04Icon} label="Empresas" />
        <NavItem href="/contacts" icon={UserMultipleIcon} label="Contactos" />
        <NavItem href="/tasks" icon={Task01Icon} label="Tareas" />
        <NavGroup
          icon={BarChartIcon}
          label="Ventas"
          items={[
            { href: "/pipeline", label: "Pipeline de ventas" },
            { href: "/pipeline/clientes", label: "Clientes" },
          ]}
        />
        <NavItem href="/forms" icon={BrowserIcon} label="Formularios" />
        <NavItem href="/cotizaciones" icon={Invoice01Icon} label="Cotizaciones" />
        <NavItem href="/projects" icon={FolderKanbanIcon} label="Proyectos" />
      </div>

      <div className="px-0">
        <SectionLabel label="Calendario" />
        <div className="px-3 flex flex-col gap-1">
          <NavItem href="/appointment-types" icon={Calendar01Icon} label="Tipos de Cita" />
          <NavItem href="/availability" icon={Clock01Icon} label="Disponibilidad" />
          <NavItem href="/appointments" icon={CalendarCheckIn01Icon} label="Citas Agendadas" />
        </div>
      </div>
    </div>
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

function MailNav({ unreadCount }: { unreadCount: number }) {
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
            <HugeiconsIcon icon={PencilEdit01Icon} size={ICON_SIZE} color="white" />
            Redactar
          </button>
        ) : (
          <Link href="/emails" className={composeBtnClass}>
            <HugeiconsIcon icon={PencilEdit01Icon} size={ICON_SIZE} color="white" />
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
                <HugeiconsIcon icon={f.icon} size={ICON_SIZE} color={ICON_COLOR} />
                <span>{f.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {f.key === "inbox" && unreadCount > 0 && (
                  <span className="text-xs bg-nav-hover text-text-primary px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
                )}
                {isActive && <Check size={13} className="text-text-secondary" strokeWidth={2.5} />}
              </div>
            </>
          );
          return isOnEmail && emailCtx ? (
            <button key={f.key} onClick={() => emailCtx.setFolder(f.key)} className={cls}>{inner}</button>
          ) : (
            <Link key={f.key} href={f.key === "inbox" ? "/emails" : `/emails?box=${f.key}`} className={cls}>{inner}</Link>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0">
        <p className={sectionLabelClass}>Cuentas</p>

        {isOnEmail && emailCtx ? (
          <button onClick={() => emailCtx.setSelectedCompanyId(null)} className={navItemClass(selectedCompanyId === null, "w-full text-left justify-between")}>
            <div className="flex items-center gap-2.5">
              <HugeiconsIcon icon={Building04Icon} size={ICON_SIZE} color={ICON_COLOR} />
              <span className="truncate">Todas</span>
            </div>
            {selectedCompanyId === null && <Check size={13} className="text-text-secondary" strokeWidth={2.5} />}
          </button>
        ) : (
          <Link href="/emails" className={navItemClass(false)}>
            <HugeiconsIcon icon={Building04Icon} size={ICON_SIZE} color={ICON_COLOR} />
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
                      ? <HugeiconsIcon icon={InboxIcon} size={14} color="#22c55e" />
                      : <HugeiconsIcon icon={SentIcon} size={14} color="#f59e0b" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{company.name}</span>
                    {!company.imapHost && <span className="text-[10px] text-amber-600 font-medium">Sin IMAP</span>}
                  </div>
                </div>
                {isSelected && <Check size={13} className="text-text-secondary shrink-0" strokeWidth={2.5} />}
              </>
            );
            return (
              <div key={company.id} className="group relative">
                {isOnEmail && emailCtx ? (
                  <button onClick={() => emailCtx.setSelectedCompanyId(company.id)} className={navItemClass(isSelected, "w-full text-left pr-8 justify-between")}>{inner}</button>
                ) : (
                  <Link href={`/emails?company=${company.id}`} className={`${navItemClass(false)} pr-8`}>{inner}</Link>
                )}
                {isOnEmail && emailCtx?.onOpenConfig && (
                  <button
                    onClick={() => emailCtx.onOpenConfig(company)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-text-primary hover:bg-nav-active transition-opacity duration-200 rounded-md motion-reduce:transition-none"
                    title="Configurar SMTP / IMAP"
                  >
                    <HugeiconsIcon icon={Settings01Icon} size={14} color={ICON_COLOR} />
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

function KbNav() {
  return <KbSidebarTree />;
}

// ─── Tab 6: Gestión de contenido ───────────────────────────────────────────────

type ContentClientEntry = { id: string; name: string; kind: string };

function ContentNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [clients, setClients] = useState<ContentClientEntry[]>([]);

  useEffect(() => {
    fetch("/api/content/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (Array.isArray(data)) setClients(data.map((c) => ({ id: c.id, name: c.name, kind: c.kind })));
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
          <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} color="white" />
          Nuevo cliente / marca
        </Link>
      </div>

      <div className="px-3 pb-2 shrink-0">
        <NavItem href="/contenido" icon={MegaphoneIcon} label="Todos los calendarios" />
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
                    className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: c.kind === "cliente" ? "#3545D6" : "#5363EE" }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{c.name}</span>
                </div>
                {isActive && <Check size={13} className="text-text-secondary shrink-0" strokeWidth={2.5} />}
              </Link>
            );
          })}
          {clients.length === 0 && (
            <p className="text-xs text-text-secondary px-3 py-2 italic">Aún no hay clientes ni marcas</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 5: Asistente ─────────────────────────────────────────────────────────

interface AssistantNavProps {
  onSearchOpen: () => void;
  onNavigate?: () => void;
}

function AssistantNav({ onSearchOpen, onNavigate }: AssistantNavProps) {
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
        onNavigate?.();
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
          onClick={onNavigate}
          className="w-full min-h-11 flex items-center justify-center gap-2 bg-action-primary text-action-primary-foreground py-2.5 px-3 rounded-control text-sm font-semibold hover:bg-action-secondary transition-colors duration-200 motion-reduce:transition-none"
        >
          <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} color="white" />
          Nueva conversación
        </Link>
        <button
          type="button"
          onClick={onSearchOpen}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-colors"
        >
          <HugeiconsIcon icon={Search01Icon} size={ICON_SIZE} color="#9ca3af" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="text-[10px] font-mono bg-surface-sidebar border border-border-subtle px-1.5 py-0.5 rounded">⌘K</kbd>
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
              <p role="status" className="px-1 pb-1.5 text-[11px] text-text-secondary">
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
                        onClick={onNavigate}
                        className={`${navItemClass(isActive)} pr-8 w-full`}
                      >
                        <HugeiconsIcon icon={AiChatIcon} size={ICON_SIZE} color={ICON_COLOR} className="shrink-0" />
                        <span className="truncate text-sm">{conv.title}</span>
                      </Link>
                      {deletingId === conv.id ? (
                        <div className="absolute inset-0 flex items-center justify-end gap-1 pr-1 bg-surface-elevated rounded-lg">
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-[10px] px-2 py-1 rounded hover:bg-nav-hover text-text-secondary transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => deleteConv(conv.id)}
                            className="text-[10px] px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors"
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
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
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
  const pathname = usePathname();
  const { data: session } = useSession();
  const { notifications, unreadCount: notifUnread, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const { openSearch } = useGlobalSearch();
  const [sidebarNotifOpen, setSidebarNotifOpen] = useState(false);
  const [sidebarUserOpen, setSidebarUserOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  const unreadEmailCount = notifications.filter(n => n.type === "NEW_EMAIL" && !n.isRead).length;

  const closeUserMenuForNavigation = () => {
    setSidebarUserOpen(false);
    onNavigate?.();
  };

  const handleSignOut = () => {
    onNavigate?.();
    void signOut();
  };

  const getTabForPath = (p: string): SidebarTab => {
    if (p.startsWith("/kb")) return "kb";
    if (p.startsWith("/emails") || p.startsWith("/campaigns")) return "mail";
    if (p.startsWith("/assistant")) return "assistant";
    if (p.startsWith("/boveda")) return "vault";
    if (p.startsWith("/contenido")) return "content";
    return "home";
  };

  const [activeTab, setActiveTab] = useState<SidebarTab>(() => getTabForPath(pathname));

  useEffect(() => {
    setActiveTab(getTabForPath(pathname));
  }, [pathname]);

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

  const isAssistant = activeTab === "assistant";
  const shellClass =
    variant === "floating"
      ? "flex h-full w-full flex-col overflow-hidden rounded-surface bg-white shadow-sm"
      : `${SIDEBAR_W} flex h-screen flex-shrink-0 flex-col overflow-hidden bg-surface-sidebar`;

  return (
    <>
      <aside ref={asideRef} aria-label="Barra lateral principal" className={shellClass}>
        <SectionSwitcher
          activeTab={activeTab}
          onChange={setActiveTab}
          unreadCount={unreadEmailCount}
          onNavigate={onNavigate}
        />

        <div className="flex-1 overflow-y-auto min-h-0 relative">
          <div className={activeTab === "home" ? "block" : "hidden"}>
            <HomeNav />
          </div>
          <div className={activeTab === "mail" ? "flex flex-col h-full" : "hidden"}>
            <MailNav unreadCount={unreadEmailCount} />
          </div>
          <div className={activeTab === "kb" ? "flex flex-col h-full" : "hidden"}>
            <KbNav />
          </div>
          <div className={activeTab === "vault" ? "flex flex-col h-full" : "hidden"}>
            <VaultNav />
          </div>
          <div className={activeTab === "assistant" ? "flex flex-col h-full" : "hidden"}>
            <AssistantNav onSearchOpen={openSearch} onNavigate={onNavigate} />
          </div>
          <div className={activeTab === "content" ? "flex flex-col h-full" : "hidden"}>
            <ContentNav onNavigate={onNavigate} />
          </div>
        </div>

        {/* ── Bottom bar (only on assistant tab) ─────────────────────────────── */}
        {isAssistant && (
          <div className="shrink-0 border-t border-border-subtle px-3 py-3 flex items-center gap-1">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setSidebarNotifOpen(v => !v); setSidebarUserOpen(false); }}
                className="relative w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-colors"
                title="Notificaciones"
              >
                <HugeiconsIcon icon={Notification01Icon} size={16} />
                {notifUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {notifUnread > 99 ? "99+" : notifUnread}
                  </span>
                )}
              </button>

              {sidebarNotifOpen && (
                <div className="crm-floating-menu absolute bottom-full left-0 mb-2 w-72 bg-surface-elevated rounded-lg overflow-hidden z-50 border border-border-subtle">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
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
                  <div className="max-h-72 overflow-y-auto divide-y divide-border-subtle">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                        <HugeiconsIcon icon={Notification01Icon} size={22} color="#d1d5db" />
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
                              {n.body && <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-2">{n.body}</p>}
                              <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.createdAt)}</p>
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
                className="w-8 h-8 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                title={session?.user?.name || "Usuario"}
              >
                <img src="/avt.webp" alt={session?.user?.name || "Usuario"} className="w-full h-full object-cover" />
              </button>

              {sidebarUserOpen && (
                <div className="crm-floating-menu absolute bottom-full right-0 mb-2 w-52 bg-surface-elevated rounded-lg py-1 z-50 border border-border-subtle">
                  <div className="px-4 py-3 border-b border-border-subtle">
                    <p className="text-sm font-semibold text-text-primary truncate">{session?.user?.name || "Usuario"}</p>
                    <p className="text-xs text-text-secondary truncate">{session?.user?.email || ""}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={closeUserMenuForNavigation}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                  >
                    <HugeiconsIcon icon={UserMultipleIcon} size={14} color="#9ca3af" />
                    Mi perfil
                  </Link>
                  <Link
                    href="/settings"
                    onClick={closeUserMenuForNavigation}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                  >
                    <HugeiconsIcon icon={Settings01Icon} size={14} color="#9ca3af" />
                    Configuración
                  </Link>
                  <Link
                    href="/settings/digest"
                    onClick={closeUserMenuForNavigation}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                  >
                    <HugeiconsIcon icon={Notification01Icon} size={14} color="#9ca3af" />
                    Resumen WhatsApp
                  </Link>
                  <Link
                    href="/settings/ai-models"
                    onClick={closeUserMenuForNavigation}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-sidebar transition-colors"
                  >
                    <HugeiconsIcon icon={AiChatIcon} size={14} color="#9ca3af" />
                    Modelos de IA
                  </Link>
                  <div className="border-t border-border-subtle mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <HugeiconsIcon icon={Logout01Icon} size={14} color="#ef4444" />
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
