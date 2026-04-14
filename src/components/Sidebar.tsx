"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
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
  GlobeIcon,
  Add01Icon,
  ZapIcon,
  Analytics01Icon,
  GitBranchIcon,
  BarChartIcon,
  Megaphone01Icon,
  Book01Icon,
  Archive01Icon,
  SentIcon,
  Folder01Icon,
  FolderAddIcon,
  PencilEdit01Icon,
  Refresh01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { useNotifications } from "@/src/context/NotificationContext";
import { useOptionalEmailContext } from "@/src/context/EmailContext";
import { ChevronRight, ChevronDown, Plus, Trash2 } from "lucide-react";
import PageIcon from "@/src/components/kb/PageIcon";

type SidebarTab = "home" | "mail" | "kb";

// ─── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel }: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-72 mx-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-gray-900 mb-1">¿Eliminar página?</p>
        <p className="text-xs text-gray-500 mb-1 truncate font-medium">"{name}"</p>
        <p className="text-xs text-gray-400 mb-5">Las subpáginas se conservarán pero perderán su padre.</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
          >
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
    <Link
      href={href}
      className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all text-sm ${
        isActive ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <HugeiconsIcon icon={icon} size={16} color={isActive ? "#111827" : "currentColor"} />
        <span className="truncate">{label}</span>
      </div>
      {badge != null && badge > 0 && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? "bg-gray-400 text-white" : "bg-blue-500 text-white"}`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ─── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({ icon, active, onClick, title, badge }: { icon: any; active: boolean; onClick: () => void; title: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative flex-1 flex items-center justify-center h-9 rounded-xl transition-all ${
        active ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      <HugeiconsIcon icon={icon} size={16} color={active ? "#111827" : "currentColor"} />
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1.5 mt-5">{label}</p>;
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
    <Link
      href={`/projects/${project.id}`}
      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all text-sm ${
        isActive ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <HugeiconsIcon icon={ProjectIcon} size={14} color={isActive ? "#111827" : "currentColor"} />
        <span className="truncate text-xs">{project.name}</span>
      </div>
      {count > 0 && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? "bg-gray-400 text-white" : "bg-gray-100 text-gray-500"}`}>
          {count}
        </span>
      )}
    </Link>
  );
}

function HomeNav({ projects }: { projects: any[] }) {
  return (
    <div className="py-3">
      <div className="px-3 flex flex-col gap-0.5">
        <NavItem href="/" icon={Home01Icon} label="Inicio" />
        <NavItem href="/companies" icon={Building04Icon} label="Empresas" />
        <NavItem href="/contacts" icon={UserMultipleIcon} label="Contactos" />
        <NavItem href="/tasks" icon={Task01Icon} label="Tareas" />
        <NavItem href="/pipeline" icon={BarChartIcon} label="Ventas" />
        <NavItem href="/forms" icon={BrowserIcon} label="Formularios" />
      </div>

      <div className="px-3 mt-1">
        <SectionLabel label="Calendario" />
        <div className="flex flex-col gap-0.5">
          <NavItem href="/appointment-types" icon={Calendar01Icon} label="Tipos de Cita" />
          <NavItem href="/availability" icon={Clock01Icon} label="Disponibilidad" />
          <NavItem href="/appointments" icon={CalendarCheckIn01Icon} label="Citas Agendadas" />
        </div>
      </div>

      <div className="px-3 mt-1">
        <div className="flex items-center justify-between px-3 mb-1.5 mt-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Proyectos</p>
          <Link href="/projects/create" className="text-gray-400 hover:text-gray-700 transition-colors">
            <HugeiconsIcon icon={Add01Icon} size={14} />
          </Link>
        </div>
        <div className="flex flex-col gap-0.5">
          {projects.map((project) => <ProjectItem key={project.id} project={project} />)}
          <Link href="/projects" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors rounded-xl">
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

function MailNav({ unreadCount }: { unreadCount: number }) {
  const emailCtx = useOptionalEmailContext();
  const pathname = usePathname();

  // Fetch companies independently so they always show regardless of emailCtx state
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
          // Also populate emailCtx so the emails page benefits
          if (emailCtx?.setCompanies) emailCtx.setCompanies(withSmtp);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active folder: from emailCtx if available, else derive from URL
  const activeFolder: string = emailCtx?.folder ?? (
    pathname.includes("box=sent") ? "sent" :
    pathname.includes("box=archived") ? "archived" : "inbox"
  );

  const selectedCompanyId = emailCtx?.selectedCompanyId ?? null;

  const handleFolderClick = (key: "inbox" | "sent" | "archived") => {
    if (emailCtx?.setFolder) emailCtx.setFolder(key);
  };

  const handleCompanyClick = (id: string | null) => {
    if (emailCtx?.setSelectedCompanyId) emailCtx.setSelectedCompanyId(id);
  };

  const isOnEmail = pathname.startsWith("/emails");

  return (
    <div className="flex flex-col h-full">
      {/* Compose */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        {emailCtx?.onCompose ? (
          <button
            onClick={emailCtx.onCompose}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={14} color="white" />
            Redactar
          </button>
        ) : (
          <Link
            href="/emails"
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={14} color="white" />
            Redactar
          </Link>
        )}
      </div>

      {/* Folders */}
      <div className="px-3 pb-2 shrink-0 flex flex-col gap-0.5">
        {EMAIL_FOLDERS.map((f) => {
          const isActive = activeFolder === f.key;
          return isOnEmail && emailCtx ? (
            <button
              key={f.key}
              onClick={() => handleFolderClick(f.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                isActive ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <HugeiconsIcon icon={f.icon} size={15} color={isActive ? "#111827" : "currentColor"} />
              <span>{f.label}</span>
              {f.key === "inbox" && unreadCount > 0 && (
                <span className="ml-auto text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
                  {unreadCount}
                </span>
              )}
            </button>
          ) : (
            <Link
              key={f.key}
              href={f.key === "inbox" ? "/emails" : `/emails?box=${f.key}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                isActive ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <HugeiconsIcon icon={f.icon} size={15} color={isActive ? "#111827" : "currentColor"} />
              <span>{f.label}</span>
              {f.key === "inbox" && unreadCount > 0 && (
                <span className="ml-auto text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mx-4 border-t border-gray-100 my-1 shrink-0" />

      {/* Accounts */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 py-2">
          Cuentas
        </p>

        {/* All */}
        {isOnEmail && emailCtx ? (
          <button
            onClick={() => handleCompanyClick(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
              selectedCompanyId === null ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <HugeiconsIcon icon={Building04Icon} size={15} color={selectedCompanyId === null ? "#111827" : "currentColor"} />
            <span className="truncate">Todas</span>
          </button>
        ) : (
          <Link href="/emails" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <HugeiconsIcon icon={Building04Icon} size={15} color="currentColor" />
            <span className="truncate">Todas</span>
          </Link>
        )}

        {companies.map((company) => {
          const isSelected = selectedCompanyId === company.id;
          return (
            <div key={company.id} className="group relative">
              {isOnEmail && emailCtx ? (
                <button
                  onClick={() => handleCompanyClick(company.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left pr-8 ${
                    isSelected ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="shrink-0">
                    {company.imapHost
                      ? <HugeiconsIcon icon={InboxIcon} size={14} color="#22c55e" />
                      : <HugeiconsIcon icon={SentIcon} size={14} color="#fbbf24" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{company.name}</span>
                    {!company.imapHost && <span className="text-[10px] text-amber-500 font-medium">Sin IMAP</span>}
                  </div>
                </button>
              ) : (
                <Link
                  href={`/emails?company=${company.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors pr-8"
                >
                  <div className="shrink-0">
                    {company.imapHost
                      ? <HugeiconsIcon icon={InboxIcon} size={14} color="#22c55e" />
                      : <HugeiconsIcon icon={SentIcon} size={14} color="#fbbf24" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{company.name}</span>
                    {!company.imapHost && <span className="text-[10px] text-amber-500 font-medium">Sin IMAP</span>}
                  </div>
                </Link>
              )}
              {isOnEmail && emailCtx?.onOpenConfig && (
                <button
                  onClick={() => emailCtx.onOpenConfig(company)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-700 transition-all rounded-lg hover:bg-gray-100"
                  title="Configurar SMTP / IMAP"
                >
                  <HugeiconsIcon icon={Settings01Icon} size={13} />
                </button>
              )}
            </div>
          );
        })}

        {companies.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2 italic">Sin cuentas configuradas</p>
        )}
      </div>

      {/* Sync — only on emails page with context */}
      {isOnEmail && emailCtx && (
        <>
          <div className="mx-4 border-t border-gray-100 shrink-0" />
          <div className="px-3 py-2 shrink-0 flex flex-col gap-1">
            <button
              onClick={() => emailCtx.onSync(false)}
              disabled={emailCtx.isSyncing}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <HugeiconsIcon icon={Refresh01Icon} size={14} color="currentColor" />
              {emailCtx.isSyncing ? "Sincronizando..." : "Sincronizar"}
            </button>
            <button
              onClick={() => emailCtx.onSync(true)}
              disabled={emailCtx.isSyncing}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 py-1.5 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <HugeiconsIcon icon={Refresh01Icon} size={12} color="currentColor" />
              Descargar todo el historial
            </button>
          </div>
        </>
      )}

      {/* Marketing */}
      <div className="px-3 pb-3 shrink-0">
        <div className="mx-0 border-t border-gray-100 mb-2" />
        <SectionLabel label="Marketing" />
        <NavItem href="/campaigns" icon={Megaphone01Icon} label="Campañas de Email" />
      </div>
    </div>
  );
}

// ─── Tab 3: Knowledge Base ─────────────────────────────────────────────────────

interface KbNode {
  id: string;
  title: string;
  emoji: string | null;
  isFolder: boolean;
  _count: { children: number };
}

function KbTreeNode({ page, depth, onRefresh }: { page: KbNode; depth: number; onRefresh: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = pathname === `/kb/${page.id}`;
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<KbNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const hasChildren = page._count.children > 0 || (loaded && children.length > 0);

  const loadChildren = useCallback(async () => {
    const res = await fetch(`/api/kb?parentId=${page.id}`);
    if (res.ok) { setChildren(await res.json()); setLoaded(true); }
  }, [page.id]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!expanded && !loaded) await loadChildren();
    setExpanded(v => !v);
  };

  const createChild = async (isFolder = false) => {
    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: isFolder ? "Nueva carpeta" : "Sin título", parentId: page.id, isFolder }),
    });
    if (res.ok) {
      const child = await res.json();
      const res2 = await fetch(`/api/kb?parentId=${page.id}`);
      if (res2.ok) { setChildren(await res2.json()); setLoaded(true); }
      setExpanded(true);
      if (!isFolder) router.push(`/kb/${child.id}`);
    }
  };

  const deletePage = async () => {
    await fetch(`/api/kb/${page.id}`, { method: "DELETE" });
    setDeleteConfirm(false);
    onRefresh();
    if (pathname === `/kb/${page.id}`) router.push("/kb");
  };

  return (
    <>
      {deleteConfirm && (
        <DeleteModal
          name={page.title || "Sin título"}
          onConfirm={deletePage}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}

      <div>
        <div
          className={`group flex items-center gap-1 rounded-lg transition-colors cursor-pointer relative ${
            isActive ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
          style={{ paddingLeft: `${6 + depth * 14}px`, paddingRight: "4px", paddingTop: "5px", paddingBottom: "5px" }}
        >
          {/* Chevron */}
          <button
            onClick={handleToggle}
            className={`w-4 h-4 flex items-center justify-center shrink-0 rounded transition-colors ${
              !hasChildren ? "opacity-0 pointer-events-none" : ""
            } ${isActive ? "text-gray-700" : "text-gray-400"}`}
          >
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>

          {/* Icon + title */}
          <Link
            href={`/kb/${page.id}`}
            className="flex items-center gap-1.5 flex-1 min-w-0 py-0.5"
            onClick={page.isFolder ? async (e) => {
              if (!expanded) { e.preventDefault(); await loadChildren(); setExpanded(true); }
            } : undefined}
          >
            {page.isFolder ? (
              <HugeiconsIcon icon={expanded ? Folder01Icon : Folder01Icon} size={14} color={isActive ? "#111827" : "#9ca3af"} />
            ) : (
              <span className="text-sm leading-none flex items-center">
                <PageIcon emoji={page.emoji} size={14} fallback="📄" />
              </span>
            )}
            <span className="truncate text-xs font-medium">{page.title || "Sin título"}</span>
          </Link>

          {/* Actions */}
          <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${isActive ? "opacity-100" : ""}`}>
            <button
              onClick={(e) => { e.preventDefault(); createChild(false); }}
              className={`w-5 h-5 flex items-center justify-center rounded ${isActive ? "text-gray-500 hover:text-gray-900" : "text-gray-300 hover:text-gray-700 hover:bg-gray-200"}`}
              title="Nueva página"
            >
              <Plus size={10} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); createChild(true); }}
              className={`w-5 h-5 flex items-center justify-center rounded ${isActive ? "text-gray-500 hover:text-gray-900" : "text-gray-300 hover:text-gray-700 hover:bg-gray-200"}`}
              title="Nueva carpeta"
            >
              <HugeiconsIcon icon={FolderAddIcon} size={10} color="currentColor" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); setDeleteConfirm(true); }}
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${isActive ? "text-gray-500 hover:text-red-500" : "text-gray-300 hover:text-red-400 hover:bg-red-50"}`}
              title="Eliminar"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>

        {expanded && loaded && (
          <div>
            {children.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic py-1" style={{ paddingLeft: `${26 + depth * 14}px` }}>Vacío</p>
            ) : (
              children.map(child => <KbTreeNode key={child.id} page={child} depth={depth + 1} onRefresh={onRefresh} />)
            )}
          </div>
        )}
      </div>
    </>
  );
}

function KbNav() {
  const router = useRouter();
  const [pages, setPages] = useState<KbNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoot = useCallback(async () => {
    const res = await fetch("/api/kb");
    if (res.ok) setPages(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRoot(); }, [fetchRoot]);

  const createRoot = async (isFolder = false) => {
    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: isFolder ? "Nueva carpeta" : "Sin título", isFolder }),
    });
    if (res.ok) {
      const page = await res.json();
      await fetchRoot();
      if (!isFolder) router.push(`/kb/${page.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* KB header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 shrink-0">
        <Link href="/kb" className="flex items-center gap-2 min-w-0">
          <HugeiconsIcon icon={Book01Icon} size={14} color="#6b7280" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">Knowledge Base</span>
        </Link>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => createRoot(false)} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Nueva página">
            <Plus size={13} />
          </button>
          <button onClick={() => createRoot(true)} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Nueva carpeta">
            <HugeiconsIcon icon={FolderAddIcon} size={13} color="currentColor" />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {loading ? (
          <div className="flex flex-col gap-1 px-2 pt-2">
            {[1,2,3].map(i => <div key={i} className="h-6 rounded bg-gray-100 animate-pulse" />)}
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400 mb-2">Sin páginas</p>
            <button onClick={() => createRoot(false)} className="text-xs text-blue-600 hover:underline">Crear primera página</button>
          </div>
        ) : (
          pages.map(page => <KbTreeNode key={page.id} page={page} depth={0} onRefresh={fetchRoot} />)
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
    <aside className="w-60 bg-white h-screen flex flex-col border-r border-gray-100 flex-shrink-0 overflow-hidden">
      {/* Brand */}
      <div className="px-5 py-4 flex items-center gap-2.5 shrink-0 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
          <HugeiconsIcon icon={GlobeIcon} size={16} color="white" />
        </div>
        <span className="text-sm font-bold tracking-tight text-gray-900">Noxy CRM</span>
      </div>

      {/* 3-tab switcher */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 shrink-0">
        <TabBtn icon={Home01Icon} active={activeTab === "home"} onClick={() => setActiveTab("home")} title="Inicio" />
        <TabBtn icon={InboxIcon} active={activeTab === "mail"} onClick={() => setActiveTab("mail")} title="Correos" badge={unreadEmailCount} />
        <TabBtn icon={Book01Icon} active={activeTab === "kb"} onClick={() => setActiveTab("kb")} title="Knowledge Base" />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "home" && <HomeNav projects={projects} />}
        {activeTab === "mail" && <MailNav unreadCount={unreadEmailCount} />}
        {activeTab === "kb" && <KbNav />}
      </div>
    </aside>
  );
}
