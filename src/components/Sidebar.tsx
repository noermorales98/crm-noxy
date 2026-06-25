"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
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
  FolderKanbanIcon,
  Add01Icon,
  ZapIcon,
  Analytics01Icon,
  GitBranchIcon,
  BarChartIcon,
  Megaphone01Icon,
  Book01Icon,
  Archive01Icon,
  SentIcon,
  PencilEdit01Icon,
  Refresh01Icon,
  Settings01Icon,
  AiChatIcon,
} from "@hugeicons/core-free-icons";
import { useNotifications } from "@/src/context/NotificationContext";
import { useOptionalEmailContext, formatLastEmailSync } from "@/src/context/EmailContext";
import KbSidebarTree from "@/src/components/kb/KbSidebarTree";
import { ChevronDown, Check } from "lucide-react";

type SidebarTab = "home" | "mail" | "kb" | "assistant";

// ─── Design tokens (Notion-style premium) ─────────────────────────────────────

const ICON_COLOR = "#37352F";
const SIDEBAR_W = "w-64";
const ICON_SIZE = 16;

const itemBase = "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors";
const itemActive = "bg-nav-active text-text-primary font-medium";
const itemHover = "hover:bg-nav-hover";
const itemIdle = "text-text-primary";

const sectionLabelClass = "text-[11px] font-medium italic text-text-secondary uppercase tracking-wider px-3 pt-6 pb-2";

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
  { id: "home", label: "Inicio", href: "/", icon: Home01Icon, accent: "#5B9BF5", accentBg: "#E1F0FF" },
  { id: "mail", label: "Correo", href: "/emails", icon: InboxIcon, accent: "#F0A050", accentBg: "#FFECD2" },
  { id: "kb", label: "Docs", href: "/kb", icon: Book01Icon, accent: "#9B7EDE", accentBg: "#F0E6F9" },
  { id: "assistant", label: "Asistente", href: "/assistant", icon: AiChatIcon, accent: "#6366F1", accentBg: "#EEF2FF" },
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
}: {
  activeTab: SidebarTab;
  onChange: (tab: SidebarTab) => void;
  unreadCount: number;
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
          className="absolute left-3 right-3 top-full mt-1 z-50 bg-surface-elevated rounded-lg py-1.5 overflow-hidden border border-border-subtle"
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
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div className="relative bg-white rounded-lg p-6 w-72 mx-4" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-[#37352F] mb-1">¿Eliminar página?</p>
        <p className="text-xs text-text-secondary mb-1 truncate font-medium">&quot;{name}&quot;</p>
        <p className="text-xs text-text-secondary mb-5">Las subpáginas se conservarán pero perderán su padre.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 text-sm text-[#37352F] rounded-lg hover:bg-surface-sidebar transition-colors">
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
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-nav-hover text-[#37352F]">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {isActive && <Check size={13} className="text-text-secondary" strokeWidth={2.5} />}
      </div>
    </Link>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <p className={sectionLabelClass}>{label}</p>;
}

// ─── Tab 1: Inicio ─────────────────────────────────────────────────────────────

const PROJECT_ICON_MAP: Record<string, any> = {
  "zap": ZapIcon, "trending-up": Analytics01Icon,
  "git-branch": GitBranchIcon, "megaphone": Megaphone01Icon,
};

function ProjectItem({ project }: { project: any }) {
  const pathname = usePathname();
  const isActive = pathname === `/projects/${project.id}`;
  const ProjectIcon = PROJECT_ICON_MAP[project.icon] || FolderKanbanIcon;
  const count = (project._count?.forms || 0) + (project._count?.campaigns || 0) +
    (project._count?.contacts || 0) + (project._count?.companies || 0) + (project._count?.tasks || 0);
  return (
    <Link href={`/projects/${project.id}`} className={`${navItemClass(isActive)} justify-between`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <HugeiconsIcon icon={ProjectIcon} size={ICON_SIZE} color={ICON_COLOR} />
        <span className="truncate">{project.name}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {count > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-nav-hover text-[#37352F]">
            {count}
          </span>
        )}
        {isActive && <Check size={13} className="text-text-secondary" strokeWidth={2.5} />}
      </div>
    </Link>
  );
}

function HomeNav({ projects }: { projects: any[] }) {
  return (
    <div className="py-1 pb-4">
      <div className="px-3 flex flex-col gap-1">
        <NavItem href="/" icon={Home01Icon} label="Inicio" />
        <NavItem href="/companies" icon={Building04Icon} label="Empresas" />
        <NavItem href="/contacts" icon={UserMultipleIcon} label="Contactos" />
        <NavItem href="/tasks" icon={Task01Icon} label="Tareas" />
        <NavItem href="/pipeline" icon={BarChartIcon} label="Ventas" />
        <NavItem href="/forms" icon={BrowserIcon} label="Formularios" />
      </div>

      <div className="px-0">
        <SectionLabel label="Calendario" />
        <div className="px-3 flex flex-col gap-1">
          <NavItem href="/appointment-types" icon={Calendar01Icon} label="Tipos de Cita" />
          <NavItem href="/availability" icon={Clock01Icon} label="Disponibilidad" />
          <NavItem href="/appointments" icon={CalendarCheckIn01Icon} label="Citas Agendadas" />
        </div>
      </div>

      <div className="px-0">
        <div className="flex items-center justify-between px-3 pt-6 pb-2">
          <p className="text-[11px] font-medium italic text-text-secondary uppercase tracking-wider">Proyectos</p>
          <Link href="/projects/create" className="text-[#37352F] hover:bg-nav-hover rounded-md p-1 transition-colors mr-1">
            <HugeiconsIcon icon={Add01Icon} size={14} color={ICON_COLOR} />
          </Link>
        </div>
        <div className="px-3 flex flex-col gap-1">
          {projects.map((project) => <ProjectItem key={project.id} project={project} />)}
          <Link href="/projects" className={`${itemBase} ${itemIdle} ${itemHover} text-text-secondary hover:text-[#37352F]`}>
            Ver todos ({projects.length})
          </Link>
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
];

const composeBtnClass = "w-full flex items-center justify-center gap-2 bg-[#2D2D2D] text-white py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-[#1a1a1a] transition-colors";

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
    pathname.includes("box=archived") ? "archived" : "inbox"
  );
  const selectedCompanyId = emailCtx?.selectedCompanyId ?? null;
  const isOnEmail = pathname.startsWith("/emails");
  const lastSyncLabel = emailCtx?.lastSyncedAt ? formatLastEmailSync(emailCtx.lastSyncedAt) : null;

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
                  <span className="text-[10px] bg-nav-hover text-[#37352F] px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-[#37352F] hover:bg-nav-active transition-all rounded-md"
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

      {isOnEmail && emailCtx && (
        <div className="px-3 py-2 shrink-0 flex flex-col gap-1">
          <button
            onClick={() => emailCtx.onSync(false)}
            disabled={emailCtx.isSyncing}
            className={`${itemBase} ${itemIdle} ${itemHover} w-full justify-center disabled:opacity-50`}
          >
            <HugeiconsIcon icon={Refresh01Icon} size={ICON_SIZE} color={ICON_COLOR} />
            {emailCtx.isSyncing ? "Sincronizando..." : "Sincronizar"}
          </button>
          <button
            onClick={() => emailCtx.onSync(true)}
            disabled={emailCtx.isSyncing}
            className={`${itemBase} ${itemIdle} ${itemHover} w-full justify-center text-xs disabled:opacity-50`}
          >
            <HugeiconsIcon icon={Refresh01Icon} size={14} color={ICON_COLOR} />
            Descargar todo el historial
          </button>
          {lastSyncLabel && (
            <p className="text-[10px] text-text-secondary text-center pt-1">
              Última sync: {lastSyncLabel}
            </p>
          )}
        </div>
      )}

      <div className="px-0 pb-3 shrink-0">
        <SectionLabel label="Marketing" />
        <div className="px-3">
          <NavItem href="/campaigns" icon={Megaphone01Icon} label="Campañas de Email" />
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Knowledge Base ─────────────────────────────────────────────────────

function KbNav() {
  return <KbSidebarTree />;
}

// ─── Tab 4: Asistente ─────────────────────────────────────────────────────────

type AiConversation = { id: string; title: string; updatedAt: string };

function AssistantNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/assistant/conversations");
    if (res.ok) setConversations(await res.json());
  }, []);

  useEffect(() => {
    if (session?.user) fetchConversations();
  }, [session, fetchConversations]);

  const createNew = async () => {
    setCreating(true);
    const res = await fetch("/api/assistant/conversations", { method: "POST" });
    if (res.ok) {
      const conv = await res.json();
      await fetchConversations();
      router.push(`/assistant/${conv.id}`);
    }
    setCreating(false);
  };

  const deleteConv = async (id: string) => {
    await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
    setDeletingId(null);
    await fetchConversations();
    if (pathname === `/assistant/${id}`) router.push("/assistant");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-1 pb-3 shrink-0">
        <button
          onClick={createNew}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 bg-[#2D2D2D] text-white py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
        >
          <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} color="white" />
          {creating ? "Creando…" : "Nueva conversación"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">
        {conversations.length === 0 ? (
          <p className="text-xs text-text-secondary px-1 py-2 italic">Sin conversaciones</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {conversations.map((conv) => {
              const isActive = pathname === `/assistant/${conv.id}`;
              return (
                <div key={conv.id} className="group relative">
                  <Link
                    href={`/assistant/${conv.id}`}
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
      </div>
    </div>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { notifications } = useNotifications();
  const [projects, setProjects] = useState<any[]>([]);

  const unreadEmailCount = notifications.filter(n => n.type === "NEW_EMAIL" && !n.isRead).length;

  const getTabForPath = (p: string): SidebarTab => {
    if (p.startsWith("/kb")) return "kb";
    if (p.startsWith("/emails") || p.startsWith("/campaigns")) return "mail";
    if (p.startsWith("/assistant")) return "assistant";
    return "home";
  };

  const [activeTab, setActiveTab] = useState<SidebarTab>(() => getTabForPath(pathname));

  useEffect(() => {
    setActiveTab(getTabForPath(pathname));
  }, [pathname]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/projects?limit=5")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setProjects(d); })
      .catch(() => {});
  }, [session]);

  return (
    <aside className={`${SIDEBAR_W} bg-white border-r border-border-subtle h-screen flex flex-col flex-shrink-0 overflow-hidden`}>
      <SectionSwitcher
        activeTab={activeTab}
        onChange={setActiveTab}
        unreadCount={unreadEmailCount}
      />

      <div className="flex-1 overflow-y-auto min-h-0 relative">
        <div className={activeTab === "home" ? "block" : "hidden"}>
          <HomeNav projects={projects} />
        </div>
        <div className={activeTab === "mail" ? "flex flex-col h-full" : "hidden"}>
          <MailNav unreadCount={unreadEmailCount} />
        </div>
        <div className={activeTab === "kb" ? "flex flex-col h-full" : "hidden"}>
          <KbNav />
        </div>
        <div className={activeTab === "assistant" ? "flex flex-col h-full" : "hidden"}>
          <AssistantNav />
        </div>
      </div>
    </aside>
  );
}
