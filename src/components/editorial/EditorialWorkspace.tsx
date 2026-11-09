"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type KeyboardEvent, type CSSProperties } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { CRM_THEMES, crmThemeCssVariables } from "@/src/lib/crm-themes";
import { useHeader } from "@/src/context/HeaderContext";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, ArrowRight01Icon, Cancel01Icon, Home01Icon, Task01Icon, FolderKanbanIcon, UserMultipleIcon, Calendar01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { NAV_GROUPS, AREA_ITEMS, SETTINGS_ITEMS } from "@/src/lib/crm-navigation";
import { hasPermission, canManageTeam, type RoleName, type ModulePermissions } from "@/src/lib/permissions";
import { WIDGET_REGISTRY, WIDGET_MAP } from "@/src/lib/dashboardWidgets";
import { TAB_REGISTRY, TAB_MAP } from "@/src/lib/dashboardTabs";
import type { DashboardData } from "@/src/lib/dashboardData";
import SampleViews, { SAMPLE_VIEW_TITLES } from "./SampleViews";
import { counts, createSampleData, dayKey, overdueTasks, pendingTasks, restoreWorkspace, SAMPLE_MEMBERS, SAMPLE_DEALS, type WorkspaceData, type WorkTask } from "@/src/lib/editorial-data";
import "@/src/styles/editorial-kit.css";
import "@/src/styles/editorial.css";

const CORE = ["tasks_pending", "appointments_upcoming", "projects_active", "contacts_total"];
const DEFAULT_TABS = ["latest_leads", "upcoming_appointments_list", "pending_tasks_list"];
const STORAGE = "noxy.editorial.sample.v1";
const definitions = [
  { id: "contacts_total", label: "Contactos", key: "contacts", unit: "contactos", caption: "En la organización", path: "/contacts" },
  { id: "appointments_upcoming", label: "Próximas citas", key: "appointments", unit: "citas", caption: "Desde hoy", path: "/appointments" },
  { id: "tasks_pending", label: "Tareas pendientes", key: "tasks", unit: "tareas", caption: "Por completar", path: "/tasks" },
  { id: "projects_active", label: "Proyectos", key: "projects", unit: "proyectos", caption: "En el espacio", path: "/projects" },
] as const;
const destinationTitles: Record<string, string> = { "/": "Inicio", "/contacts": "Contactos", "/companies": "Empresas", "/tasks": "Tareas", "/projects": "Proyectos", "/pipeline": "Pipeline de ventas", "/pipeline/clientes": "Clientes", "/pipeline/historial": "Historial de tratos", "/cotizaciones": "Cotizaciones", "/forms": "Formularios", "/appointments": "Citas Agendadas", "/appointment-types": "Tipos de Cita", "/availability": "Disponibilidad", "/emails": "Correo", "/campaigns": "Campañas", "/profile": "Perfil", "/kb": "Docs", "/assistant": "Asistente", "/boveda": "Bóveda", "/contenido/general": "Gestión de contenido", "/settings": "Ajustes", "/settings/equipo": "Equipo", "/settings/ai-models": "Modelos de IA", "/settings/digest": "Resumen diario" };
type Overlay = { kind: "create-task" | "create-contact" | "create-deal" | "account" } | { kind: "task" | "appointment" | "contact" | "deal"; id: string } | { kind: "customize" | "menu" } | null;
type DataState = "ready" | "empty" | "loading" | "error";
type Props = { initialData?: WorkspaceData; initialWidgets?: string[]; initialTabs?: string[]; legacyData?: DashboardData; sample?: boolean; degraded?: boolean; stale?: boolean };
function Icon({ icon }: { icon: typeof Home01Icon }) { return <HugeiconsIcon icon={icon} size={16} strokeWidth={1.5} aria-hidden="true" />; }
function initials(name: string) { return name.split(/\s+/).map(n => n[0]).slice(0, 2).join(""); }
const personColors = new Map([...SAMPLE_MEMBERS, ...createSampleData().contacts.map(c => c.name)].map((name, index) => [name, index % 3]));
function Avatar({ name }: { name: string }) { return <span className={`ed-avatar ed-person-${personColors.get(name) ?? Array.from(name).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3}`} aria-hidden="true">{initials(name)}</span>; }
function formatDate(iso: string, options: Intl.DateTimeFormatOptions = {}) { return new Intl.DateTimeFormat("es-MX", { timeZone: "America/Cancun", ...options }).format(new Date(iso)); }
function dueLabel(task: WorkTask, now: string) {
  if (!task.due) return "Sin vencimiento";
  const day = dayKey(task.due), today = dayKey(now);
  if (day < today) return `Venció el ${formatDate(task.due, { day: "numeric", month: "short" })}`;
  return `${day === today ? "Hoy" : formatDate(task.due, { day: "numeric", month: "short" })}, ${formatDate(task.due, { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

export default function EditorialWorkspace({ initialData, initialWidgets, initialTabs, legacyData, sample = false, degraded = false, stale = false }: Props) {
  const router = useRouter();
  const { setConfig } = useHeader();
  useEffect(() => { if (!sample) { setConfig({ title: "Inicio", pageHeader: true }); return () => setConfig({}); } }, [sample, setConfig]);
  const { data: session } = useSession();
  const [data, setData] = useState<WorkspaceData>(() => initialData ?? createSampleData());
  const [widgets, setWidgets] = useState(initialWidgets ?? CORE);
  const [tabs, setTabs] = useState(initialTabs ?? DEFAULT_TABS);
  const [draftWidgets, setDraftWidgets] = useState(widgets);
  const [draftTabs, setDraftTabs] = useState(tabs);
  const [activeTab, setActiveTab] = useState(tabs[0] ?? "");
  const [deals, setDeals] = useState(SAMPLE_DEALS);
  const [route, setRoute] = useState("/");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("pending");
  const [owner, setOwner] = useState("");
  const [ascending, setAscending] = useState(true);
  const [dataState, setDataState] = useState<DataState>(degraded && !stale ? "error" : "ready");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [appearance, setAppearance] = useState("Noxy Índigo");
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const main = useRef<HTMLElement>(null);
  const rowPositions = useRef(new Map<string, number>());
  function captureRowPositions() {
    rowPositions.current = new Map(Array.from(main.current?.querySelectorAll<HTMLElement>("[data-row-id]") || []).map(row => [row.dataset.rowId!, row.getBoundingClientRect().top]));
  }
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { rowPositions.current.clear(); return; }
    const root = main.current;
    if (!root || !rowPositions.current.size) return;
    for (const row of root.querySelectorAll<HTMLElement>("[data-row-id]")) {
      const previous = rowPositions.current.get(row.dataset.rowId!);
      row.getAnimations().forEach(animation => animation.cancel());
      const delta = previous === undefined ? 0 : previous - row.getBoundingClientRect().top;
      // Only surviving rows move in response to input. New rows never perform an entrance.
      if (delta && Math.abs(delta) < root.clientHeight) row.animate([{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }], { duration: parseFloat(getComputedStyle(root).getPropertyValue("--duration")), easing: getComputedStyle(root).getPropertyValue("--ease").trim() });
    }
    rowPositions.current.clear();
  }, [query, filter, owner, ascending, data, deals]);
  const readyStorage = useRef(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!sample && initialData) { setData(initialData); setDataState(degraded && !stale ? "error" : "ready"); }
  }, [initialData, degraded, stale, sample]);

  useEffect(() => {
    if (!sample) return;
    function navigate() {
      const next = window.location.hash.slice(1) || "/";
      rowPositions.current.clear();
      setRoute(next); setQuery(""); setFilter("pending"); setOwner(""); setOverlay(null); setMessage("");
      requestAnimationFrame(() => { if (main.current) main.current.scrollTop = scrollPositions.current[next] ?? 0; });
    }
    navigate();
    const state = new URLSearchParams(window.location.search).get("state");
    if (state && ["empty", "loading", "error"].includes(state)) setDataState(state as DataState);
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (stored && typeof stored === "object") {
        setData(d => restoreWorkspace(d, stored.workspace, stored.completed));
        if (Array.isArray(stored.deals) && stored.deals.every((deal: typeof SAMPLE_DEALS[number]) => deal && typeof deal.id === "string" && typeof deal.title === "string" && typeof deal.contactId === "string" && Number.isSafeInteger(deal.cents) && deal.cents >= 0 && deal.currency === "MXN" && ["Contacto", "Propuesta", "Negociación"].includes(deal.stage))) setDeals(stored.deals);
        if (Array.isArray(stored.widgets) && stored.widgets.every((id: unknown) => typeof id === "string" && CORE.includes(id))) setWidgets(stored.widgets);
        if (Array.isArray(stored.tabs) && stored.tabs.every((id: unknown) => typeof id === "string" && TAB_MAP[id])) { setTabs(stored.tabs); setActiveTab(stored.tabs[0] ?? ""); }
        if (typeof stored.appearance === "string") setAppearance(stored.appearance);
      }
    } catch { /* Corrupt or unavailable local storage never blocks the workspace. */ }
    readyStorage.current = true;
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, [sample]);

  useEffect(() => {
    if (!sample || !readyStorage.current) return;
    try { localStorage.setItem(STORAGE, JSON.stringify({ workspace: data, deals, completed: data.tasks.filter(t => t.completed).map(t => t.id), widgets, tabs, appearance })); }
    catch { setMessage("No pudimos conservar los cambios en este navegador."); }
  }, [sample, data, deals, widgets, tabs, appearance]);

  useEffect(() => {
    const el = dialog.current;
    if (!el || !overlay) return;
    returnFocus.current = document.activeElement as HTMLElement;
    el.showModal();
    return () => { el.close(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); else (document.querySelector(".ed-mobile-bar button") as HTMLElement | null)?.focus(); };
  }, [overlay]);

  const effective: WorkspaceData = dataState === "empty" ? { ...data, tasks: [], appointments: [], contacts: [], projects: [], totals: {} } : data;
  const totals = counts(effective);
  const pending = pendingTasks(effective.tasks);
  const overdue = dataState === "ready" && !stale ? overdueTasks(effective) : [];
  const priorityTask = dataState === "ready" && !stale ? overdue[0] ?? pending[0] : undefined;
  const upcoming = effective.appointments.filter(a => Date.parse(a.start) >= Date.parse(data.now)).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const activeProjects = effective.projects.filter(p => !p.archived);
  const latestContacts = [...effective.contacts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const selectedTask = overlay?.kind === "task" ? data.tasks.find(t => t.id === overlay.id) : undefined;
  const selectedAppointment = overlay?.kind === "appointment" ? data.appointments.find(a => a.id === overlay.id) : undefined;
  const selectedContact = overlay?.kind === "contact" ? data.contacts.find(c => c.id === overlay.id) : undefined;
  const selectedDeal = overlay?.kind === "deal" ? deals.find(d => d.id === overlay.id) : undefined;
  const project = route.startsWith("/projects/") ? effective.projects.find(p => p.id === route.split("/")[2]) : undefined;
  const title = project?.name ?? SAMPLE_VIEW_TITLES[route] ?? destinationTitles[route] ?? "Destino no disponible";
  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const allowed = (permission: Parameters<typeof hasPermission>[2]) => sample || hasPermission(role, permissions, permission);

  function href(path: string) { return sample && path !== "/assistant" ? `#${path}` : path; }
  function rememberScroll() { if (main.current) scrollPositions.current[route] = main.current.scrollTop; }
  function navLink(path: string, label: string, icon = Home01Icon) { return <a key={path} href={href(path)} onClick={() => { rememberScroll(); if (sample) setOverlay(null); }} aria-current={route === path ? "page" : undefined} className="ed-nav-link"><Icon icon={icon} /><span>{label}</span></a>; }
  function navigation() { return <>
    <a className="ed-brand" href={href("/")} onClick={rememberScroll}><Image src="/Isotipo_Azul.svg" width={24} height={18} alt="" unoptimized /><span><strong>Noxy CRM</strong><small>{data.organization}</small></span></a>
    <nav aria-label="Navegación principal">{NAV_GROUPS.map(group => <div className="ed-nav-group" key={group.label}><p>{group.label}</p>{group.items.filter(item => allowed(item.permission)).map(item => item.kind === "area" ? <details key={item.section} open={AREA_ITEMS[item.section].some(child => child.href === route)} ><summary className="ed-nav-link"><Icon icon={item.section === "contacts" ? UserMultipleIcon : item.section === "agenda" ? Calendar01Icon : FolderKanbanIcon} /><span>{item.label}</span><Icon icon={ArrowRight01Icon} /></summary><div className="ed-nav-children">{AREA_ITEMS[item.section].map(child => navLink(child.href, child.label))}</div></details> : item.href === "/emails" ? <details key={item.href} open={route === "/emails" || route === "/campaigns"}><summary className="ed-nav-link"><Icon icon={Home01Icon} /><span>Correo</span></summary><div className="ed-nav-children">{navLink("/emails", "Bandeja de entrada")}{navLink("/campaigns", "Campañas")}</div></details> : navLink(item.href, item.label, item.href === "/tasks" ? Task01Icon : item.href === "/projects" ? FolderKanbanIcon : Home01Icon))}</div>)}</nav>
    <div className="ed-nav-bottom">{allowed("settings") && <details><summary className="ed-nav-link"><Icon icon={Settings01Icon} /><span>Ajustes</span></summary><div className="ed-nav-children">{SETTINGS_ITEMS.filter(item => !item.requiresTeam || sample || canManageTeam(role)).map(item => navLink(item.href, item.label, Settings01Icon))}</div></details>}<button className="ed-account" aria-label="Abrir cuenta" onClick={() => setOverlay({ kind: "account" })}><Avatar name={sample ? SAMPLE_MEMBERS[0] : session?.user?.name || "Cuenta"} /><span>{sample ? SAMPLE_MEMBERS[0] : session?.user?.name || "Mi cuenta"}<small>{data.organization}</small></span></button></div>
  </>; }
  function retry() { if (sample) setDataState("ready"); else router.refresh(); }
  function stateContent(noun: string, children: ReactNode, empty: boolean) {
    if (dataState === "loading") return <div className="ed-skeleton-list" role="status" aria-label={`Cargando ${noun}`}><span /><span /><span /></div>;
    if (dataState === "error") return <div className="ed-empty" role="status"><p>No pudimos cargar {noun}.</p><button className="ed-text-button" onClick={retry}>Reintentar</button></div>;
    return empty ? <p className="ed-empty">No hay {noun}.</p> : children;
  }
  function panel(id: string, heading: string, path: string, children: ReactNode, className = "", empty = false) { return <section id={id} className={`ed-panel ${className}`} aria-labelledby={`${id}-title`}><header className="ed-panel-header"><h2 id={`${id}-title`}>{heading}</h2><a className="ed-text-button" href={href(path)} onClick={rememberScroll}>Ver {heading === "Proyectos" ? "todos" : "todas"}<Icon icon={ArrowRight01Icon} /></a></header>{stateContent(heading.toLowerCase(), children, empty)}</section>; }
  function taskRows(tasks: WorkTask[]) { return <div className="ed-rows">{tasks.map(t => <button className="ed-row ed-task-row" key={t.id} data-row-id={t.id} onClick={() => { setMessage(""); setOverlay({ kind: "task", id: t.id }); }}><span className="ed-task-mark" aria-hidden="true" /><span className="ed-identity"><strong>{t.title}</strong><small>{t.owner || "Sin responsable"}</small></span><span className={`ed-meta ${t.due && dayKey(t.due) < dayKey(data.now) && !t.completed ? "ed-overdue" : ""}`}>{t.completed ? "Completada" : dueLabel(t, data.now)}</span><Icon icon={ArrowRight01Icon} /></button>)}</div>; }
  function appointmentRows(limit: number) { return <div className="ed-rows">{upcoming.slice(0, limit).map(a => <button className="ed-row ed-appointment-row" key={a.id} onClick={() => setOverlay({ kind: "appointment", id: a.id })}><span className="ed-identity"><strong>{a.title}</strong><small>{a.contact}</small></span><span className="ed-meta">{formatDate(a.start, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })} a {formatDate(a.end, { hour: "2-digit", minute: "2-digit", hour12: false })}</span><Icon icon={ArrowRight01Icon} /></button>)}</div>; }
  function contactRows(limit: number) { const rows = latestContacts.filter(c => `${c.name} ${c.email}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())); if (!ascending) rows.reverse(); return <div className="ed-rows">{rows.slice(0, limit).map(c => <button className="ed-row" key={c.id} data-row-id={c.id} onClick={() => setOverlay({ kind: "contact", id: c.id })}><Avatar name={c.name} /><span className="ed-identity"><strong>{c.name}</strong><small>{c.email || "Sin correo"}</small></span><span className="ed-meta">{formatDate(c.createdAt, { day: "numeric", month: "short" })}</span></button>)}{rows.length === 0 && <p className="ed-empty">No hay contactos para esta búsqueda.</p>}</div>; }
  function projectRows(projects: typeof activeProjects) { return <div className="ed-rows">{projects.map(p => <a className="ed-row" key={p.id} href={href(`/projects/${p.id}`)} onClick={rememberScroll}><Icon icon={FolderKanbanIcon} /><span className="ed-identity"><strong>{p.name}</strong><small>{p.owner || "Proyecto"}</small></span>{sample && <span className="ed-pill">{p.archived ? "Archivado" : "En progreso"}</span>}</a>)}</div>; }
  function tabKeys(event: KeyboardEvent, index: number) { let next = index; if (event.key === "ArrowRight") next = (index + 1) % tabs.length; else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length; else if (event.key === "Home") next = 0; else if (event.key === "End") next = tabs.length - 1; else return; event.preventDefault(); setActiveTab(tabs[next]); tabRefs.current[next]?.focus(); }
  function openCustomize() { setDraftWidgets([...widgets]); setDraftTabs([...tabs]); setMessage(""); setOverlay({ kind: "customize" }); }
  async function savePreferences() {
    setBusy(true); setMessage("");
    try {
      if (!sample) { const res = await fetch("/api/dashboard-preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ widgets: draftWidgets, tabs: draftTabs }) }); if (!res.ok) throw new Error(); }
      setWidgets(draftWidgets); setTabs(draftTabs); if (!draftTabs.includes(activeTab)) setActiveTab(draftTabs[0] ?? ""); setOverlay(null); setMessage(sample ? "Guardado en este navegador" : "Guardado"); if (!sample) router.refresh();
    } catch { setMessage("No pudimos guardar. Intenta de nuevo."); } finally { setBusy(false); }
  }
  async function toggleTask() {
    if (!selectedTask) return; setBusy(true); setMessage("");
    try {
      if (!sample) { const res = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedTask.id, isCompleted: !selectedTask.completed }) }); if (!res.ok) throw new Error(); }
      const next = !selectedTask.completed;
      setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === selectedTask.id ? { ...t, completed: next } : t), totals: { ...d.totals, tasks: d.totals.tasks === undefined ? undefined : Math.max(0, d.totals.tasks + (next ? -1 : 1)) } }));
      setMessage(next ? "Tarea completada" : "Tarea reabierta"); if (!sample) router.refresh();
    } catch { setMessage("No pudimos actualizar la tarea. Intenta de nuevo."); } finally { setBusy(false); }
  }
  function reorder(ids: string[], index: number, offset: number) { const result = [...ids]; [result[index], result[index + offset]] = [result[index + offset], result[index]]; return result; }
  function preferenceList(kind: "widgets" | "tabs") {
    const ids = kind === "widgets" ? draftWidgets : draftTabs;
    const set = kind === "widgets" ? setDraftWidgets : setDraftTabs;
    const registry = kind === "widgets" ? WIDGET_REGISTRY.filter(w => !sample || CORE.includes(w.id)) : TAB_REGISTRY.filter(t => !sample || DEFAULT_TABS.includes(t.id));
    return <div className="ed-preferences">{ids.map((id, i) => <div className="ed-preference" key={id}><span>{kind === "widgets" ? WIDGET_MAP[id]?.label : TAB_MAP[id]?.label}</span><button className="ed-icon-button" aria-label={`Subir ${kind === "widgets" ? WIDGET_MAP[id]?.label : TAB_MAP[id]?.label}`} disabled={busy || i === 0} onClick={() => set(reorder(ids, i, -1))}>↑</button><button className="ed-icon-button" aria-label={`Bajar ${kind === "widgets" ? WIDGET_MAP[id]?.label : TAB_MAP[id]?.label}`} disabled={busy || i === ids.length - 1} onClick={() => set(reorder(ids, i, 1))}>↓</button><button className="ed-icon-button" aria-label={`Quitar ${kind === "widgets" ? WIDGET_MAP[id]?.label : TAB_MAP[id]?.label}`} disabled={busy} onClick={() => set(ids.filter(v => v !== id))}><Icon icon={Cancel01Icon} /></button></div>)}{registry.filter(v => !ids.includes(v.id)).map(v => <button key={v.id} className="ed-button" disabled={busy} onClick={() => set([...ids, v.id])}>Añadir {v.label}</button>)}</div>;
  }
  const currentTab = TAB_MAP[activeTab];
  const taskList = (filter === "completed" ? effective.tasks.filter(t => t.completed) : pending).filter(t => !owner || t.owner === owner);
  if (!ascending) taskList.reverse();
    const selectedTheme = CRM_THEMES.find(t => t.label === appearance) ?? CRM_THEMES[0];
  return <div className="noxy-editorial" onPointerDownCapture={captureRowPositions} onKeyDownCapture={captureRowPositions} data-embedded={sample ? undefined : "true"} data-section="shell" style={sample ? crmThemeCssVariables(selectedTheme) as CSSProperties : undefined}>
    <aside className="ed-sidebar">{navigation()}</aside>
    <div className="ed-mobile-bar"><button className="ed-icon-button" aria-label="Abrir menú" aria-expanded={overlay?.kind === "menu"} onClick={() => setOverlay({ kind: "menu" })}><Icon icon={Menu01Icon} /></button><span>{title}</span>{route === "/" && (priorityTask ? <button className="ed-button ed-primary" onClick={() => setOverlay({ kind: "task", id: priorityTask.id })}>Revisar tarea</button> : <button className="ed-text-button" onClick={openCustomize}>Personalizar</button>)}</div>
    <div className="ed-topbar"><span>Noxy CRM / {title}</span><span>{sample ? "Equipo de muestra" : data.organization}</span></div>
    <main className="ed-main" ref={main}>
      <div className={`ed-canvas ${route !== "/" ? "ed-secondary" : ""}`}>
        {route === "/" ? <>
          <header className="ed-greeting" data-section="home-pulse"><div><h1>Inicio</h1><div className="ed-finding">{overdue.length > 0 && <span className="ed-urgent">Atender hoy</span>}<p>{stale ? "Datos guardados, actualización pendiente." : overdue.length ? overdue.length === 1 ? "Una tarea vencida necesita atención." : `${overdue.length} tareas vencidas necesitan atención.` : dataState === "error" ? "No pudimos actualizar el panel." : pending.length ? `Siguiente tarea: ${pending[0].title}.` : "Sin tareas pendientes."}</p>{priorityTask && <button className="ed-button ed-primary" onClick={() => setOverlay({ kind: "task", id: priorityTask.id })}>Revisar tarea<Icon icon={ArrowRight01Icon} /></button>}{stale && <button className="ed-button" onClick={retry}>Reintentar</button>}</div><p className="ed-date">{formatDate(data.now, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></div><button className="ed-button ed-customize" onClick={openCustomize}>Personalizar inicio</button></header>
          {sample && <p className="ed-sample">Sample data · Datos de muestra</p>}
          {message && !overlay && <p className="ed-message" role="status">{message}</p>}
          {upcoming[0] && <a className="ed-next-appointment" href={href("/appointments")}>Próxima cita · {formatDate(upcoming[0].start, { hour: "2-digit", minute: "2-digit", hour12: false })} · {upcoming[0].title}</a>}
          <div className="ed-grid">
            <div className="ed-counts" aria-label="Resumen" data-section="home-counts">{widgets.filter(id => CORE.includes(id)).map(id => { const d = definitions.find(v => v.id === id)!; return <a key={id} href={href(d.path)} className="ed-count"><span>{d.label}</span>{dataState === "loading" ? <span className="ed-skeleton-value" /> : <strong>{dataState === "error" ? <span className="ed-missing">-</span> : totals[d.key]} <small>{d.unit}</small></strong>}<small>{d.caption}</small></a>; })}</div>
            {widgets.includes("tasks_pending") && panel("home-tasks", "Tareas pendientes", "/tasks", taskRows(pending.slice(0, 4)), "ed-span-9", pending.length === 0)}
            {widgets.includes("appointments_upcoming") && panel("home-agenda", "Próximas citas", "/appointments", appointmentRows(3), "ed-span-3", upcoming.length === 0)}
            {widgets.includes("projects_active") && panel("home-projects", "Proyectos", "/projects", projectRows(activeProjects.slice(0, 2)), "ed-span-6", activeProjects.length === 0)}
            {tabs.length > 0 && <section className="ed-panel ed-span-6 ed-activity" aria-labelledby="activity-title" data-section="home-tabs"><header className="ed-panel-header"><h2 id="activity-title">{activeTab === "latest_leads" ? "Contactos recientes" : "Actividad"}</h2><a className="ed-text-button" href={href(currentTab?.href || "/contacts")}>Ver todos<Icon icon={ArrowRight01Icon} /></a></header><div className="ed-tabs" role="tablist" aria-label="Actividad">{tabs.map((id, i) => <button key={id} ref={el => { tabRefs.current[i] = el; }} role="tab" id={`tab-${id}`} aria-selected={activeTab === id} aria-controls="activity-panel" tabIndex={activeTab === id ? 0 : -1} onClick={() => setActiveTab(id)} onKeyDown={event => tabKeys(event, i)}>{id === "latest_leads" ? "Contactos" : id === "upcoming_appointments_list" ? "Citas" : id === "pending_tasks_list" ? "Tareas" : TAB_MAP[id]?.label}</button>)}</div><div id="activity-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>{stateContent("actividad", activeTab === "latest_leads" ? contactRows(2) : activeTab === "pending_tasks_list" ? taskRows(pending.slice(0, 2)) : activeTab === "upcoming_appointments_list" ? appointmentRows(2) : legacyData && currentTab?.render(legacyData), activeTab === "latest_leads" ? !latestContacts.length : activeTab === "pending_tasks_list" ? !pending.length : activeTab === "upcoming_appointments_list" ? !upcoming.length : !legacyData)}</div></section>}
            {!sample && legacyData && widgets.filter(id => !CORE.includes(id)).map(id => <section key={id} className={`ed-panel ed-legacy ${WIDGET_MAP[id]?.size === "sm" ? "ed-span-3" : "ed-span-6"}`} aria-label={WIDGET_MAP[id]?.label}>{stateContent(WIDGET_MAP[id]?.label.toLowerCase() || "datos", WIDGET_MAP[id]?.render(legacyData), false)}</section>)}
            {widgets.length === 0 && tabs.length === 0 && <section className="ed-panel ed-span-12"><h2>Tu inicio</h2><p className="ed-empty">No hay bloques seleccionados.</p><button className="ed-button" onClick={openCustomize}>Personalizar inicio</button></section>}
          </div>
        </> : <>
          <header className="ed-view-header"><h1>{title}</h1>{route === "/tasks" && <button className="ed-button ed-primary" onClick={() => setOverlay({ kind: "create-task" })}>Crear tarea</button>}{route === "/pipeline" && <button className="ed-button ed-primary" onClick={() => setOverlay({ kind: "create-deal" })}>Crear trato</button>}{route === "/contacts" && <button className="ed-button ed-primary" onClick={() => setOverlay({ kind: "create-contact" })}>Crear contacto</button>}{sample && <p className="ed-sample">Sample data · Datos de muestra</p>}</header>
          {project && <nav className="ed-tabs" aria-label="Proyecto">{[["", "Resumen"], ["info", "Información"], ["tareas", "Tareas"], ["actividad", "Actividad"], ["docs", "Docs"], ["registros", "Registros"], ["correo", "Correo"]].map(([suffix,label]) => <a className="ed-text-button" key={suffix} href={href(`/projects/${project.id}${suffix ? `/${suffix}` : ""}`)} aria-current={route === `/projects/${project.id}${suffix ? `/${suffix}` : ""}` ? "page" : undefined}>{label}</a>)}</nav>}
          {dataState !== "ready" ? <section className="ed-panel ed-list-panel"><h2>{title}</h2>{dataState === "empty" && <p className="ed-list-count">0 registros</p>}{stateContent(title.toLowerCase(), null, true)}</section> : route === "/tasks" || (project && (!route.split("/")[3] || route.split("/")[3] === "tareas")) ? <section className="ed-panel ed-list-panel"><div className="ed-toolbar"><div className="ed-tabs" role="group" aria-label="Estado de tareas"><button aria-pressed={filter === "pending"} onClick={() => setFilter("pending")}>Pendientes</button><button aria-pressed={filter === "completed"} onClick={() => setFilter("completed")}>Completadas</button></div><label>Responsable<select value={owner} onChange={e => setOwner(e.target.value)}><option value="">Todo el equipo</option>{[...new Set(effective.tasks.map(t => t.owner).filter(Boolean))].map(name => <option key={name}>{name}</option>)}</select></label><button className="ed-button" onClick={() => setAscending(!ascending)}>Vencimiento {ascending ? "↑" : "↓"}</button></div><p className="ed-list-count">{taskList.filter(t => !project || t.projectId === project.id).length} tareas</p>{stateContent("tareas para este filtro", taskRows(taskList.filter(t => !project || t.projectId === project.id)), !taskList.filter(t => !project || t.projectId === project.id).length)}</section>
          : route === "/contacts" ? <section className="ed-panel ed-list-panel"><div className="ed-toolbar"><label>Buscar contacto<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre o correo" /></label><button className="ed-button" onClick={() => setAscending(!ascending)}>Fecha {ascending ? "↓" : "↑"}</button></div><p className="ed-list-count">{latestContacts.filter(c => `${c.name} ${c.email}`.toLowerCase().includes(query.toLowerCase())).length} contactos</p>{stateContent("contactos registrados", contactRows(6), !effective.contacts.length)}</section>
          : route === "/projects" ? <section className="ed-panel ed-list-panel"><div className="ed-tabs" role="group" aria-label="Estado de proyectos"><button aria-pressed={filter !== "archived"} onClick={() => setFilter("pending")}>Activos</button><button aria-pressed={filter === "archived"} onClick={() => setFilter("archived")}>Archivados</button></div>{stateContent("proyectos", projectRows(effective.projects.filter(p => p.archived === (filter === "archived"))), !effective.projects.filter(p => p.archived === (filter === "archived")).length)}</section>
          : route === "/appointments" ? <section className="ed-panel ed-list-panel"><div className="ed-tabs" role="group" aria-label="Periodo de citas"><button aria-pressed={filter !== "today"} onClick={() => setFilter("pending")}>Próximas</button><button aria-pressed={filter === "today"} onClick={() => setFilter("today")}>Hoy</button></div>{stateContent("próximas citas", <div className="ed-rows">{upcoming.filter(a => filter !== "today" || dayKey(a.start) === dayKey(data.now)).map(a => <button className="ed-row" key={a.id} onClick={() => setOverlay({ kind: "appointment", id: a.id })}><span className="ed-identity"><strong>{a.title}</strong><small>{a.contact}</small></span><span className="ed-meta">{formatDate(a.start, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</span></button>)}</div>, !upcoming.filter(a => filter !== "today" || dayKey(a.start) === dayKey(data.now)).length)}</section>
          : route === "/pipeline" ? <section className="ed-list-panel"><p className="ed-list-count">{deals.length} oportunidades · {new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2 }).format(deals.reduce((sum, d) => sum + d.cents, 0) / 100)} MXN</p><div className="ed-board">{["Contacto", "Propuesta", "Negociación"].map(stage => <section key={stage} className="ed-board-column"><h2>{stage}</h2><p className="ed-list-count">{deals.filter(d => d.stage === stage).length} oportunidades</p>{deals.filter(d => d.stage === stage).map(d => <button className="ed-row" key={d.id} data-row-id={d.id} onClick={() => setOverlay({ kind: "deal", id: d.id })}><span className="ed-identity"><strong>{d.title}</strong><small>{data.contacts.find(c => c.id === d.contactId)?.name}</small></span><span className="ed-meta">{new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2 }).format(d.cents / 100)} MXN</span></button>)}</section>)}</div></section>
          : <SampleViews key={route} route={route} data={data} setData={setData} appearance={appearance} setAppearance={setAppearance} announce={setMessage} />}
          {message && !overlay && <p className="ed-message" role="status">{message}</p>}

        </>}
      </div>
    </main>
    <nav className="ed-bottom-nav" aria-label="Navegación móvil">{[["/", "Inicio"], ["/contacts", "Contactos"], ["/pipeline", "Pipeline"], ["/tasks", "Tareas"]].map(([path,label]) => <a key={path} href={href(path)} aria-current={route === path ? "page" : undefined} onClick={rememberScroll}>{label}</a>)}<button onClick={() => setOverlay({ kind: "menu" })}>Más</button></nav>
    {overlay && <dialog className={`ed-dialog ${overlay.kind === "menu" ? "ed-menu-dialog" : ""}`} ref={dialog} aria-labelledby="ed-dialog-title" onCancel={e => { e.preventDefault(); if (!busy) setOverlay(null); }} onClick={e => { if (e.target === e.currentTarget && !busy) setOverlay(null); }}><div className="ed-dialog-inner"><header><h2 id="ed-dialog-title">{overlay.kind === "customize" ? "Personalizar inicio" : overlay.kind === "menu" ? "Navegación" : overlay.kind === "account" ? "Cuenta" : overlay.kind === "create-task" ? "Crear tarea" : overlay.kind === "create-contact" ? "Crear contacto" : overlay.kind === "create-deal" ? "Crear trato" : selectedTask ? "Tarea" : selectedAppointment ? "Cita" : selectedContact ? "Contacto" : "Oportunidad"}</h2><button className="ed-icon-button" aria-label="Cerrar" disabled={busy} onClick={() => setOverlay(null)}><Icon icon={Cancel01Icon} /></button></header>{overlay.kind === "menu" ? <div className="ed-mobile-navigation"><button className="ed-button" onClick={openCustomize}>Personalizar inicio</button>{navigation()}</div> : overlay.kind === "account" ? <><a className="ed-button" href={href("/profile")} onClick={() => setOverlay(null)}>Perfil</a><a className="ed-button" href={href("/settings")} onClick={() => setOverlay(null)}>Ajustes</a></> : overlay.kind === "create-task" || overlay.kind === "create-contact" || overlay.kind === "create-deal" ? <form className="ed-form" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); const name = String(values.get("name")).trim(); if (!name) return; const id = crypto.randomUUID(); if (overlay.kind === "create-task") setData(old => ({ ...old, tasks: [...old.tasks, { id, title: name, owner: String(values.get("owner")), due: values.get("due") ? `${values.get("due")}T12:00:00-05:00` : null, projectId: String(values.get("project")) || null, completed: false }] })); else if (overlay.kind === "create-deal") setDeals(old => [...old, { id, title: name, contactId: String(values.get("contact")), stage: String(values.get("stage")), cents: Math.round(Number(values.get("amount")) * 100), currency: "MXN" }]); else setData(old => ({ ...old, contacts: [...old.contacts, { id, name, email: String(values.get("email")), createdAt: old.now }] })); setOverlay(null); setMessage("Guardado en este navegador"); }}><label>{overlay.kind === "create-contact" ? "Nombre" : "Título"}<input name="name" required /></label>{overlay.kind === "create-task" ? <><label>Responsable<select name="owner">{SAMPLE_MEMBERS.map(name => <option key={name}>{name}</option>)}</select></label><label>Vencimiento<input name="due" type="date" /></label><label>Proyecto<select name="project"><option value="">Sin proyecto</option>{data.projects.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></> : overlay.kind === "create-deal" ? <><label>Contacto<select name="contact"><option value="">Sin contacto</option>{data.contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label><label>Etapa<select name="stage">{["Contacto", "Propuesta", "Negociación"].map(stage => <option key={stage}>{stage}</option>)}</select></label><label>Importe (MXN)<input name="amount" type="number" min="0" step="0.01" required /></label></> : <label>Correo<input name="email" type="email" /></label>}<button className="ed-button ed-primary">Guardar cambios</button></form> : overlay.kind === "customize" ? <><h3>Widgets</h3>{preferenceList("widgets")}<h3>Pestañas</h3>{preferenceList("tabs")}<footer><button className="ed-button" disabled={busy} onClick={() => setOverlay(null)}>Cancelar</button><button className="ed-button ed-primary" disabled={busy} onClick={savePreferences}>{busy ? "Guardando…" : "Guardar"}</button></footer></> : selectedTask ? <><h3>{selectedTask.title}</h3><dl><dt>Responsable</dt><dd>{selectedTask.owner || "Sin responsable"}</dd><dt>Vencimiento</dt><dd>{dueLabel(selectedTask, data.now)}</dd><dt>Proyecto</dt><dd>{data.projects.find(p => p.id === selectedTask.projectId)?.name || "Sin proyecto"}</dd><dt>Estado</dt><dd>{selectedTask.completed ? "Completada" : "Pendiente"}</dd></dl><button className="ed-button ed-primary" disabled={busy} onClick={toggleTask}>{busy ? "Guardando…" : selectedTask.completed ? "Reabrir tarea" : "Completar tarea"}</button></> : selectedAppointment ? <><h3>{selectedAppointment.title}</h3><dl><dt>Contacto</dt><dd>{selectedAppointment.contact}</dd><dt>Inicio</dt><dd>{formatDate(selectedAppointment.start, { dateStyle: "medium", timeStyle: "short" })}</dd><dt>Fin</dt><dd>{formatDate(selectedAppointment.end, { dateStyle: "medium", timeStyle: "short" })}</dd></dl></> : selectedContact ? <><h3>{selectedContact.name}</h3><dl><dt>Correo</dt><dd>{selectedContact.email || "Sin correo"}</dd><dt>Alta</dt><dd>{formatDate(selectedContact.createdAt, { dateStyle: "medium" })}</dd></dl></> : selectedDeal ? <><h3>{selectedDeal.title}</h3><label>Etapa<select value={selectedDeal.stage} onChange={e => { const stage = e.target.value; setDeals(old => old.map(d => d.id === selectedDeal.id ? { ...d, stage } : d)); setMessage("Guardado en este navegador"); }}>{["Contacto", "Propuesta", "Negociación"].map(stage => <option key={stage}>{stage}</option>)}</select></label><p>{new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2 }).format(selectedDeal.cents / 100)} MXN</p></> : <p>No encontramos este registro.</p>}<p role="status" className="ed-message">{message}</p></div></dialog>}
  </div>;
}
